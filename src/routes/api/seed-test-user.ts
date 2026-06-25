import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/seed-test-user")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: "teste@alugaflow.com",
          password: "Test@123",
          email_confirm: true,
          user_metadata: { full_name: "Usuário Teste" },
        });
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "content-type": "application/json" } });
        return new Response(JSON.stringify({ ok: true, id: data.user?.id }), { headers: { "content-type": "application/json" } });
      },
    },
  },
});
