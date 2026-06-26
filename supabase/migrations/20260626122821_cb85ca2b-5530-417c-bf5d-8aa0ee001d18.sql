
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS watermark_url text,
  ADD COLUMN IF NOT EXISTS pdf_header text,
  ADD COLUMN IF NOT EXISTS pdf_footer text,
  ADD COLUMN IF NOT EXISTS person_type text NOT NULL DEFAULT 'PF',
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS razao_social text;
