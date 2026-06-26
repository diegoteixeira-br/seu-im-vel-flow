
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.contract_signatures WHERE contract_id IN (SELECT id FROM public.contracts WHERE user_id = uid);
  DELETE FROM public.inspection_photos WHERE user_id = uid;
  DELETE FROM public.inspections WHERE user_id = uid;
  DELETE FROM public.payments WHERE user_id = uid;
  DELETE FROM public.expenses WHERE user_id = uid;
  DELETE FROM public.property_photos WHERE user_id = uid;
  DELETE FROM public.tenant_documents WHERE user_id = uid;
  DELETE FROM public.contracts WHERE user_id = uid;
  DELETE FROM public.tenants WHERE user_id = uid;
  DELETE FROM public.properties WHERE user_id = uid;
  DELETE FROM public.leads WHERE user_id = uid;
  DELETE FROM public.user_roles WHERE user_id = uid;
  DELETE FROM public.profiles WHERE id = uid;

  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
