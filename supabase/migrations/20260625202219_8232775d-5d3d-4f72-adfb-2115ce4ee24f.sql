
-- Expand profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_neighborhood text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_uf text,
  ADD COLUMN IF NOT EXISTS address_zip text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_agency text,
  ADD COLUMN IF NOT EXISTS bank_account text,
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS asaas_api_key text,
  ADD COLUMN IF NOT EXISTS asaas_environment text NOT NULL DEFAULT 'sandbox';

-- Expand payments with ASAAS refs
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS asaas_payment_id text,
  ADD COLUMN IF NOT EXISTS asaas_invoice_url text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_asaas_payment_id_key
  ON public.payments(asaas_payment_id)
  WHERE asaas_payment_id IS NOT NULL;

-- Cache ASAAS customer id on tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS asaas_customer_id text;
