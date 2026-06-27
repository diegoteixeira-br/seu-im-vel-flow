// Edge Function: admin
// Substitui src/lib/admin.functions.ts (createServerFn).
// Ações: metrics | list_users | set_plan | toggle_active | toggle_admin | send_broadcast
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

  const sb = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
  const userId = userData.user.id;

  // Admin gate (defense-in-depth; RPCs também checam internamente).
  const { data: isAdmin, error: roleErr } = await sb.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleErr || !isAdmin) return json({ error: "Forbidden: admin only" }, 403);

  let payload: any = {};
  try { payload = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
  const action = String(payload.action || "");

  try {
    if (action === "metrics") {
      const { data, error } = await sb.rpc("admin_dashboard_metrics");
      if (error) throw error;
      return json(data ?? {});
    }

    if (action === "list_users") {
      const { data, error } = await sb.rpc("admin_list_users");
      if (error) throw error;
      return json(data ?? []);
    }

    if (action === "set_plan") {
      const { userId: target, plan } = payload;
      if (!target || !["free", "investidor", "imobiliaria"].includes(plan)) {
        return json({ error: "Invalid payload" }, 400);
      }
      const { error } = await sb.rpc("admin_update_user_plan", { _user_id: target, _plan: plan });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "toggle_active") {
      const { userId: target, active } = payload;
      if (!target || typeof active !== "boolean") return json({ error: "Invalid payload" }, 400);
      const { error } = await sb.rpc("admin_toggle_user_active", { _user_id: target, _active: active });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "toggle_admin") {
      const { userId: target, makeAdmin } = payload;
      if (!target || typeof makeAdmin !== "boolean") return json({ error: "Invalid payload" }, 400);
      const { error } = await sb.rpc("admin_toggle_admin", { _user_id: target, _make_admin: makeAdmin });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "send_broadcast") {
      const { subject, body, targetPlan } = payload;
      if (!subject || !body || !["all", "free", "investidor", "imobiliaria"].includes(targetPlan)) {
        return json({ error: "Invalid payload" }, 400);
      }
      let query = sb.from("profiles").select("id", { count: "exact", head: true });
      if (targetPlan !== "all") query = query.eq("plan", targetPlan);
      const { count } = await query;
      const { error } = await sb.from("admin_email_log").insert({
        subject, body, target_plan: targetPlan,
        recipients_count: count ?? 0, sent_by: userId, status: "queued",
      });
      if (error) throw error;
      await sb.from("admin_logs").insert({
        user_id: userId, action: "send_broadcast",
        details: { subject, target: targetPlan, count },
      });
      return json({ ok: true, recipients: count ?? 0 });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e: any) {
    console.error("[admin]", action, e?.message ?? e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});
