
-- Photo categories enum
CREATE TYPE public.photo_category AS ENUM ('fachada','sala','quarto','cozinha','banheiro','area_externa','vistoria_entrada','vistoria_saida');
CREATE TYPE public.inspection_type AS ENUM ('entrada','saida');

-- property_photos
CREATE TABLE public.property_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  category public.photo_category NOT NULL DEFAULT 'fachada',
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_photos TO authenticated;
GRANT ALL ON public.property_photos TO service_role;
ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own property photos" ON public.property_photos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.property_photos (property_id);

-- inspections
CREATE TABLE public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  type public.inspection_type NOT NULL,
  inspection_date date NOT NULL DEFAULT CURRENT_DATE,
  general_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO authenticated;
GRANT ALL ON public.inspections TO service_role;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own inspections" ON public.inspections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_inspections_updated_at BEFORE UPDATE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- inspection_photos
CREATE TABLE public.inspection_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  category public.photo_category NOT NULL DEFAULT 'sala',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_photos TO authenticated;
GRANT ALL ON public.inspection_photos TO service_role;
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own inspection photos" ON public.inspection_photos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.inspection_photos (inspection_id);

-- Storage policies for property-photos bucket (folder per user_id then property_id)
-- Path layout: <user_id>/<property_id>/<filename>
CREATE POLICY "Users read own property photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'property-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own property photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own property photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'property-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own property photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'property-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
