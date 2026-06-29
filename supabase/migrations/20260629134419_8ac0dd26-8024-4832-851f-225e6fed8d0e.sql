-- Colunas de controle para evitar reenvio de e-mails Resend
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS overdue_notice_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS receipt_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_payments_due_reminder
  ON public.payments(due_date) WHERE status = 'pendente';

-- Garantir extensões para cron + http
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agenda CRON diário (08:00 UTC ~ 05:00 BRT) para a função email-cron
DO $$
BEGIN
  PERFORM cron.unschedule('alugaflow-email-cron');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'alugaflow-email-cron',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fmifbxrqbwkyjgkgceyh.supabase.co/functions/v1/email-cron',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);