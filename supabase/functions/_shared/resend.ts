// Helper compartilhado para envio via Resend.
// Lê RESEND_API_KEY e RESEND_FROM_EMAIL do ambiente.

export type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  from?: string;
};

export async function sendEmail(args: SendArgs): Promise<{ id?: string; error?: string }> {
  const key = Deno.env.get("RESEND_API_KEY");
  const defaultFrom = Deno.env.get("RESEND_FROM_EMAIL") || "AlugaFlow <onboarding@resend.dev>";
  if (!key) return { error: "RESEND_API_KEY ausente" };

  const body = {
    from: args.from || defaultFrom,
    to: Array.isArray(args.to) ? args.to : [args.to],
    subject: args.subject,
    html: args.html,
    reply_to: args.replyTo,
  };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: Record<string, unknown> = {};
    try { parsed = text ? JSON.parse(text) : {}; } catch { /* noop */ }
    if (!res.ok) {
      console.error("[resend] fail", res.status, text);
      return { error: (parsed as { message?: string }).message || `HTTP ${res.status}` };
    }
    return { id: String((parsed as { id?: string }).id || "") };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export function brl(value: number | string | null | undefined): string {
  const n = typeof value === "number" ? value : Number(value || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function dateBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString("pt-BR");
}
