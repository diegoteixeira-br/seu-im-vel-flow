ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS show_contact_public BOOLEAN NOT NULL DEFAULT true;