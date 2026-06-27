
-- 1) Plans table: add limits and stripe price columns
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS max_properties INT,
  ADD COLUMN IF NOT EXISTS max_listings INT,
  ADD COLUMN IF NOT EXISTS asaas_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS advanced_reports BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_users INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Seed default limits if rows exist
UPDATE public.plans SET max_properties=1, max_listings=1, asaas_enabled=false, advanced_reports=false, max_users=1 WHERE id='free';
UPDATE public.plans SET max_properties=15, max_listings=15, asaas_enabled=true, advanced_reports=true, max_users=1 WHERE id='investidor';
UPDATE public.plans SET max_properties=NULL, max_listings=NULL, asaas_enabled=true, advanced_reports=true, max_users=5 WHERE id='imobiliaria';

-- 2) subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free','investidor','imobiliaria')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','past_due','scheduled_downgrade','incomplete')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  scheduled_plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sub_select_own" ON public.subscriptions;
CREATE POLICY "sub_select_own" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_subscriptions_updated ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) cancellations
CREATE TABLE IF NOT EXISTS public.cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  cancelled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_date TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cancellations_user ON public.cancellations(user_id);

GRANT SELECT, INSERT ON public.cancellations TO authenticated;
GRANT ALL ON public.cancellations TO service_role;
ALTER TABLE public.cancellations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "canc_select_own" ON public.cancellations;
CREATE POLICY "canc_select_own" ON public.cancellations FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "canc_insert_own" ON public.cancellations;
CREATE POLICY "canc_insert_own" ON public.cancellations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4) RPC: check plan limit
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
BEGIN
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

  RETURN jsonb_build_object(
    'allowed', (v_max IS NULL OR v_cur < v_max),
    'current', v_cur,
    'max', v_max,
    'plan', v_plan
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_plan_limit(UUID, TEXT) TO authenticated;

-- 5) Backfill subscriptions for existing users (free plan)
INSERT INTO public.subscriptions (user_id, plan_type, status)
SELECT id, COALESCE(plan,'free'), 'active' FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.id)
ON CONFLICT DO NOTHING;

-- 6) Update plans grants (already public read)
GRANT SELECT ON public.plans TO anon, authenticated;
