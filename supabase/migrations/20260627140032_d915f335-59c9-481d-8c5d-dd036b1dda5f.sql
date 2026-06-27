
-- Sub-users (Team members) support
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'owner';

CREATE INDEX IF NOT EXISTS idx_profiles_parent_id ON public.profiles(parent_id);

-- Helpers
CREATE OR REPLACE FUNCTION public.get_account_owner(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(parent_id, id) FROM public.profiles WHERE id = _user_id
$$;
REVOKE EXECUTE ON FUNCTION public.get_account_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_account_owner(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(role, 'owner') FROM public.profiles WHERE id = _user_id
$$;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;

-- Update check_plan_limit to resolve owner's plan (members share owner's plan)
CREATE OR REPLACE FUNCTION public.check_plan_limit(_user_id uuid, _resource text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_owner uuid;
  v_plan TEXT;
  v_max INT;
  v_cur INT;
  v_is_admin BOOLEAN;
BEGIN
  SELECT public.has_role(_user_id, 'admin'::app_role) INTO v_is_admin;
  SELECT public.get_account_owner(_user_id) INTO v_owner;
  IF v_owner IS NULL THEN v_owner := _user_id; END IF;

  SELECT plan INTO v_plan FROM public.profiles WHERE id = v_owner;
  IF v_plan IS NULL THEN v_plan := 'free'; END IF;

  IF _resource = 'properties' THEN
    SELECT max_properties INTO v_max FROM public.plans WHERE id = v_plan;
    SELECT COUNT(*) INTO v_cur FROM public.properties WHERE user_id = v_owner;
  ELSIF _resource = 'listings' THEN
    SELECT max_listings INTO v_max FROM public.plans WHERE id = v_plan;
    SELECT COUNT(*) INTO v_cur FROM public.properties WHERE user_id = v_owner AND listed_public = true;
  ELSIF _resource = 'users' THEN
    SELECT max_users INTO v_max FROM public.plans WHERE id = v_plan;
    -- count owner + members
    SELECT 1 + COUNT(*) INTO v_cur FROM public.profiles WHERE parent_id = v_owner;
  ELSE
    RAISE EXCEPTION 'unknown resource %', _resource;
  END IF;

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
REVOKE EXECUTE ON FUNCTION public.check_plan_limit(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_plan_limit(uuid, text) TO authenticated, service_role;

-- RLS: allow owners to view their members' profiles
DROP POLICY IF EXISTS "Owners can view their members" ON public.profiles;
CREATE POLICY "Owners can view their members" ON public.profiles
  FOR SELECT TO authenticated
  USING (parent_id = auth.uid());
