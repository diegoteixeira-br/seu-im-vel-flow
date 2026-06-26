
-- Add fields to properties for ads
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS listed_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ad_title text,
  ADD COLUMN IF NOT EXISTS ad_description text,
  ADD COLUMN IF NOT EXISTS neighborhood text;

-- Add plan + public phone visibility to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS show_phone_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_phone text;

-- Public read of listed properties
DROP POLICY IF EXISTS "Public can view listed properties" ON public.properties;
CREATE POLICY "Public can view listed properties"
  ON public.properties FOR SELECT
  TO anon, authenticated
  USING (listed_public = true);

GRANT SELECT ON public.properties TO anon;

-- Public read of photos for listed properties
DROP POLICY IF EXISTS "Public can view photos of listed properties" ON public.property_photos;
CREATE POLICY "Public can view photos of listed properties"
  ON public.property_photos FOR SELECT
  TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_photos.property_id AND p.listed_public = true));

GRANT SELECT ON public.property_photos TO anon;

-- Public read of safe profile fields for listed properties' owners
DROP POLICY IF EXISTS "Public can view owners of listed properties" ON public.profiles;
CREATE POLICY "Public can view owners of listed properties"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.user_id = profiles.id AND p.listed_public = true));

GRANT SELECT ON public.profiles TO anon;

-- Storage: allow public read of property-photos bucket objects
DROP POLICY IF EXISTS "Public read property-photos" ON storage.objects;
CREATE POLICY "Public read property-photos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'property-photos');

-- Leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  nome_interessado text NOT NULL,
  telefone text NOT NULL,
  mensagem text,
  visualizado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT INSERT ON public.leads TO anon;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their leads"
  ON public.leads FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can submit a lead for a listed property"
  ON public.leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = leads.property_id
        AND p.listed_public = true
        AND p.user_id = leads.user_id
    )
  );

CREATE INDEX IF NOT EXISTS leads_user_id_idx ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS leads_property_id_idx ON public.leads(property_id);
