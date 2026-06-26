import { createServerFn } from "@tanstack/react-start";
import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error || !data) throw new Error("Forbidden: admin only");
    return next({ context });
  });

export const getAdminMetrics = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_dashboard_metrics");
    if (error) throw error;
    return (data ?? {}) as {
      total_users?: number; new_users_30d?: number; total_properties?: number;
      total_leads?: number; estimated_monthly_revenue?: number;
      plan_counts?: Record<string, number>;
    };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_list_users");
    if (error) throw error;
    return data ?? [];
  });

export const adminSetUserPlan = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { userId: string; plan: "free" | "investidor" | "imobiliaria" }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_update_user_plan", {
      _user_id: data.userId,
      _plan: data.plan,
    });
    if (error) throw error;
    return { ok: true };
  });

export const adminToggleActive = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { userId: string; active: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_toggle_user_active", {
      _user_id: data.userId,
      _active: data.active,
    });
    if (error) throw error;
    return { ok: true };
  });

export const adminToggleAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { userId: string; makeAdmin: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_toggle_admin", {
      _user_id: data.userId,
      _make_admin: data.makeAdmin,
    });
    if (error) throw error;
    return { ok: true };
  });

export const adminSendBroadcast = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { subject: string; body: string; targetPlan: "all" | "free" | "investidor" | "imobiliaria" }) => d)
  .handler(async ({ data, context }) => {
    let query = context.supabase.from("profiles").select("id", { count: "exact", head: true });
    if (data.targetPlan !== "all") query = query.eq("plan", data.targetPlan);
    const { count } = await query;
    const { error } = await context.supabase.from("admin_email_log").insert({
      subject: data.subject,
      body: data.body,
      target_plan: data.targetPlan,
      recipients_count: count ?? 0,
      sent_by: context.userId,
      status: "queued",
    });
    if (error) throw error;
    await context.supabase.from("admin_logs").insert({
      user_id: context.userId,
      action: "send_broadcast",
      details: { subject: data.subject, target: data.targetPlan, count },
    });
    return { ok: true, recipients: count ?? 0 };
  });
