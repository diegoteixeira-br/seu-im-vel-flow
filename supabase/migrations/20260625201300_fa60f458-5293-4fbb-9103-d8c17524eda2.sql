
DO $$ BEGIN
  CREATE TYPE public.adjustment_index AS ENUM ('nenhum','igpm','ipca');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.guarantee_type AS ENUM ('sem_garantia','fiador','caucao','seguro_fianca');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS adjustment_index public.adjustment_index NOT NULL DEFAULT 'nenhum',
  ADD COLUMN IF NOT EXISTS adjustment_frequency_months integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS guarantee_type public.guarantee_type NOT NULL DEFAULT 'sem_garantia',
  ADD COLUMN IF NOT EXISTS guarantee_months integer;
