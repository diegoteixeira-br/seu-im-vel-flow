
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_type text CHECK (profile_type IN ('owner','broker')),
  ADD COLUMN IF NOT EXISTS creci text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_doc text;
  v_doc_digits text;
  v_person_type text;
BEGIN
  v_doc := NEW.raw_user_meta_data ->> 'document';
  v_doc_digits := regexp_replace(COALESCE(v_doc,''), '\D', '', 'g');
  IF length(v_doc_digits) = 14 THEN
    v_person_type := 'pj';
  ELSIF length(v_doc_digits) = 11 THEN
    v_person_type := 'pf';
  ELSE
    v_person_type := NULL;
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, profile_type, cpf, cnpj, person_type, creci)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'profile_type',
    CASE WHEN length(v_doc_digits) = 11 THEN v_doc_digits ELSE NULL END,
    CASE WHEN length(v_doc_digits) = 14 THEN v_doc_digits ELSE NULL END,
    v_person_type,
    NULLIF(NEW.raw_user_meta_data ->> 'creci', '')
  );
  RETURN NEW;
END;
$function$;
