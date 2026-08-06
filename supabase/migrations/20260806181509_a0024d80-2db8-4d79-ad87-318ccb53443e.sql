CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  duration_days integer NOT NULL CHECK (duration_days > 0),
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No client access to promo codes" ON public.promo_codes FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER promo_codes_set_updated_at BEFORE UPDATE ON public.promo_codes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.promo_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, promo_code_id)
);
GRANT SELECT ON public.promo_code_redemptions TO authenticated;
GRANT ALL ON public.promo_code_redemptions TO service_role;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own redemptions" ON public.promo_code_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.pro_access (
  user_id uuid PRIMARY KEY,
  pro_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pro_access TO authenticated;
GRANT ALL ON public.pro_access TO service_role;
ALTER TABLE public.pro_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own pro access" ON public.pro_access FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER pro_access_set_updated_at BEFORE UPDATE ON public.pro_access FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.promo_codes (code, duration_days, max_uses) VALUES ('TEST2026', 30, NULL);