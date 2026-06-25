ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auto_charge_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_charge_days_before integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS auto_charge_message text;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS charge_sent_at timestamptz;
