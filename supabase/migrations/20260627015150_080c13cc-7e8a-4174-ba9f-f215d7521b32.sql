CREATE OR REPLACE FUNCTION public.check_plan_limit(_user_id UUID, _resource TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
  v_max INT;
  v_cur INT;
  v_is_admin BOOLEAN;
BEGIN
  SELECT public.has_role(_user_id, 'admin'::app_role) INTO v_is_admin;

  SELECT plan INTO v_plan FROM public.profiles WHERE id = _user_id;
  IF v_plan IS NULL THEN v_plan := 'free'; END IF;

  IF _resource = 'properties' THEN
    SELECT max_properties INTO v_max FROM public.plans WHERE id = v_plan;
    SELECT COUNT(*) INTO v_cur FROM public.properties WHERE user_id = _user_id;
  ELSIF _resource = 'listings' THEN
    SELECT max_listings INTO v_max FROM public.plans WHERE id = v_plan;
    SELECT COUNT(*) INTO v_cur FROM public.properties WHERE user_id = _user_id AND listed_public = true;
  ELSE
    RAISE EXCEPTION 'unknown resource %', _resource;
  END IF;

  -- Admins bypass all limits (for testing all plan features)
  IF COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('allowed', true, 'current', v_cur, 'max', NULL, 'plan', 'imobiliaria');
  END IF;

  RETURN jsonb_build_object(
    'allowed', (v_max IS NULL OR v_cur < v_max),
    'current', v_cur,
    'max', v_max,
    'plan', v_plan
  );
END;
$$;