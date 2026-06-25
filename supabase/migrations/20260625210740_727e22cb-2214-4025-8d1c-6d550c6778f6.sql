
-- Extend contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS contract_type text NOT NULL DEFAULT 'residencial',
  ADD COLUMN IF NOT EXISTS extra_charges jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS guarantor_name text,
  ADD COLUMN IF NOT EXISTS guarantor_cpf text,
  ADD COLUMN IF NOT EXISTS guarantor_rg text,
  ADD COLUMN IF NOT EXISTS guarantor_phone text,
  ADD COLUMN IF NOT EXISTS guarantor_email text,
  ADD COLUMN IF NOT EXISTS guarantor_address text,
  ADD COLUMN IF NOT EXISTS signature_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS signature_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS signed_pdf_path text;

-- contract_signatures
CREATE TABLE IF NOT EXISTS public.contract_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('locador','locatario','fiador')),
  name text NOT NULL,
  email text NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  signed_name text,
  signed_cpf text,
  signed_at timestamptz,
  signer_ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_signatures TO authenticated;
GRANT ALL ON public.contract_signatures TO service_role;

ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage signatures of own contracts"
  ON public.contract_signatures FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_contract_signatures_contract ON public.contract_signatures(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_signatures_token ON public.contract_signatures(token);

-- Storage policies for signed-contracts bucket (private, owner-scoped via path prefix user_id/)
CREATE POLICY "Owners can read own signed contracts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'signed-contracts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Service role manages signed contracts"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'signed-contracts')
  WITH CHECK (bucket_id = 'signed-contracts');
