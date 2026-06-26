
-- ============== PROFILES: plan + active ==============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','investidor','imobiliaria')),
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- Permite admin atualizar qualquer profile (plano/active)
DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;
CREATE POLICY "Admins manage all profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============== PLANS ==============
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  promo_price NUMERIC(10,2),
  promo_until DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.plans TO authenticated;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Admins manage plans" ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.plans (id, name, price, benefits, sort_order) VALUES
  ('free', 'Gratuito', 0, '["Até 2 imóveis","Gestão de inquilinos","Contratos básicos"]'::jsonb, 1),
  ('investidor', 'Investidor', 49.90, '["Até 20 imóveis","Cobrança automática","Relatórios completos","Suporte prioritário"]'::jsonb, 2),
  ('imobiliaria', 'Imobiliária', 149.90, '["Imóveis ilimitados","Multi-usuário","Portal personalizado","API"]'::jsonb, 3)
ON CONFLICT (id) DO NOTHING;

-- ============== ADMIN FINANCE ENTRIES ==============
CREATE TABLE IF NOT EXISTS public.admin_finance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('receita','despesa')),
  amount NUMERIC(12,2) NOT NULL,
  category TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_finance_entries TO authenticated;
GRANT ALL ON public.admin_finance_entries TO service_role;
ALTER TABLE public.admin_finance_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage finance entries" ON public.admin_finance_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER finance_updated_at BEFORE UPDATE ON public.admin_finance_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== ADMIN EMAIL LOG ==============
CREATE TABLE IF NOT EXISTS public.admin_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  target_plan TEXT NOT NULL,
  recipients_count INT NOT NULL DEFAULT 0,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_email_log TO authenticated;
GRANT ALL ON public.admin_email_log TO service_role;
ALTER TABLE public.admin_email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage email log" ON public.admin_email_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============== ADMIN LOGS ==============
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_logs TO authenticated;
GRANT ALL ON public.admin_logs TO service_role;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read logs" ON public.admin_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert logs" ON public.admin_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============== ADMIN RPCs ==============
-- Lista usuários com email (precisa de SECURITY DEFINER pois auth.users não é exposto)
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(
  id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  plan TEXT,
  active BOOLEAN,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  is_admin BOOLEAN,
  property_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT
    p.id,
    u.email::text,
    p.full_name,
    p.phone,
    p.plan,
    p.active,
    p.created_at,
    u.last_sign_in_at,
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin'),
    (SELECT COUNT(*) FROM public.properties pr WHERE pr.user_id = p.id)
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  SELECT COUNT(*) INTO total_properties FROM public.properties WHERE listed_for_rent = true;
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
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_plan(_user_id UUID, _plan TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _plan NOT IN ('free','investidor','imobiliaria') THEN RAISE EXCEPTION 'invalid plan'; END IF;
  UPDATE public.profiles SET plan = _plan WHERE id = _user_id;
  INSERT INTO public.admin_logs (user_id, action, details) VALUES (auth.uid(),'update_plan', jsonb_build_object('target',_user_id,'plan',_plan));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_user_active(_user_id UUID, _active BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET active = _active WHERE id = _user_id;
  INSERT INTO public.admin_logs (user_id, action, details) VALUES (auth.uid(),'toggle_active', jsonb_build_object('target',_user_id,'active',_active));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_admin(_user_id UUID, _make_admin BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _make_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  END IF;
  INSERT INTO public.admin_logs (user_id, action, details) VALUES (auth.uid(),'toggle_admin', jsonb_build_object('target',_user_id,'is_admin',_make_admin));
END;
$$;

-- ============== SEED ADMIN ==============
DO $$
DECLARE
  admin_uid UUID;
BEGIN
  SELECT id INTO admin_uid FROM auth.users WHERE email = 'alugueisteixeira@gmail.com' LIMIT 1;
  IF admin_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (admin_uid, 'admin') ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Trigger garante promoção mesmo se a conta for criada depois
CREATE OR REPLACE FUNCTION public.auto_promote_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NEW.email = 'alugueisteixeira@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_promote_admin ON auth.users;
CREATE TRIGGER on_auth_user_promote_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_promote_admin();
