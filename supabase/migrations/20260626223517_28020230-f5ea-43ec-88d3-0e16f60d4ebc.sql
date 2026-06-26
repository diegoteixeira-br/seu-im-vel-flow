
-- Extend leads with pre-registration fields
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS monthly_income numeric,
  ADD COLUMN IF NOT EXISTS current_address text,
  ADD COLUMN IF NOT EXISTS current_city text,
  ADD COLUMN IF NOT EXISTS current_state text,
  ADD COLUMN IF NOT EXISTS current_zip text,
  ADD COLUMN IF NOT EXISTS doc_rg_path text,
  ADD COLUMN IF NOT EXISTS doc_income_path text,
  ADD COLUMN IF NOT EXISTS doc_residence_path text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'novo';

-- Storage policies for lead-documents
DROP POLICY IF EXISTS "Anyone can upload lead docs" ON storage.objects;
CREATE POLICY "Anyone can upload lead docs"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'lead-documents');

DROP POLICY IF EXISTS "Owners read lead docs in own folder" ON storage.objects;
CREATE POLICY "Owners read lead docs in own folder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'lead-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owners delete lead docs in own folder" ON storage.objects;
CREATE POLICY "Owners delete lead docs in own folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'lead-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
