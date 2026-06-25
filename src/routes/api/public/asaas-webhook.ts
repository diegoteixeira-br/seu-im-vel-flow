import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/asaas-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.ASAAS_WEBHOOK_TOKEN;
        const token = request.headers.get("asaas-access-token") ?? request.headers.get("x-asaas-token");
        if (!expected || token !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        let body: { event?: string; payment?: { id?: string; status?: string; paymentDate?: string; clientPaymentDate?: string; value?: number; netValue?: number } } = {};
        try { body = await request.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

        const { event, payment } = body;
        if (!event || !payment?.id) return new Response("ignored", { status: 200 });

        const paidEvents = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_RECEIVED_IN_CASH"]);
        const refundEvents = new Set(["PAYMENT_REFUNDED", "PAYMENT_DELETED"]);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (paidEvents.has(event)) {
          const paidDate = payment.paymentDate || payment.clientPaymentDate || new Date().toISOString().slice(0, 10);
          const { error } = await supabaseAdmin
            .from("payments")
            .update({
              status: "pago",
              paid_date: paidDate,
              paid_amount: payment.value ?? null,
              method: "boleto",
            })
            .eq("asaas_payment_id", payment.id);
          if (error) return new Response(error.message, { status: 500 });
        } else if (refundEvents.has(event)) {
          await supabaseAdmin
            .from("payments")
            .update({ status: "cancelado" })
            .eq("asaas_payment_id", payment.id);
        }
        return new Response("ok", { status: 200 });
      },
      GET: async () => new Response("ok", { status: 200 }),
    },
  },
});
