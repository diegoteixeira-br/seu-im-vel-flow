CREATE OR REPLACE FUNCTION public.admin_dashboard_metrics()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_users INT;
  new_users INT;
  plan_counts JSONB;
  total_properties INT;
  total_leads INT;
  est_revenue NUMERIC;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT COUNT(*) INTO total_users FROM public.profiles;
  SELECT COUNT(*) INTO new_users FROM public.profiles WHERE created_at >= now() - INTERVAL '30 days';
  SELECT jsonb_object_agg(plan, c) INTO plan_counts FROM (
    SELECT plan, COUNT(*) c FROM public.profiles GROUP BY plan
  ) s;
  SELECT COUNT(*) INTO total_properties FROM public.properties WHERE listed_public = true;
  SELECT COUNT(*) INTO total_leads FROM public.leads;
  SELECT COALESCE(SUM(
    CASE p.plan
      WHEN 'investidor' THEN COALESCE(pl.promo_price, pl.price)
      WHEN 'imobiliaria' THEN COALESCE(pl2.promo_price, pl2.price)
      ELSE 0
    END
  ),0) INTO est_revenue
  FROM public.profiles p
  LEFT JOIN public.plans pl ON pl.id = 'investidor'
  LEFT JOIN public.plans pl2 ON pl2.id = 'imobiliaria';
  RETURN jsonb_build_object(
    'total_users', total_users,
    'new_users_30d', new_users,
    'plan_counts', COALESCE(plan_counts,'{}'::jsonb),
    'total_properties', total_properties,
    'total_leads', total_leads,
    'estimated_monthly_revenue', est_revenue
  );
END;
$function$;