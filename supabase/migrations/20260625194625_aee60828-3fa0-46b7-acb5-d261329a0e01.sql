
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS rg TEXT,
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS address_street TEXT,
  ADD COLUMN IF NOT EXISTS address_number TEXT,
  ADD COLUMN IF NOT EXISTS address_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS address_city TEXT,
  ADD COLUMN IF NOT EXISTS address_state TEXT,
  ADD COLUMN IF NOT EXISTS address_zip TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_name TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_cpf TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_phone TEXT;

CREATE TABLE IF NOT EXISTS public.tenant_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_documents TO authenticated;
GRANT ALL ON public.tenant_documents TO service_role;

ALTER TABLE public.tenant_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tenant documents" ON public.tenant_documents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS tenant_documents_tenant_id_idx ON public.tenant_documents(tenant_id);

CREATE TRIGGER update_tenant_documents_updated_at
  BEFORE UPDATE ON public.tenant_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage RLS policies for tenant-documents bucket (path: <user_id>/<tenant_id>/...)
CREATE POLICY "Users read own tenant docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'tenant-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own tenant docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tenant-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own tenant docs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'tenant-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own tenant docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'tenant-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
