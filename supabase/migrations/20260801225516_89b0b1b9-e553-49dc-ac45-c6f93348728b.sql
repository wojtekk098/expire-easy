CREATE TABLE public.reminder_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  email text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  confirmed_at timestamptz,
  confirm_token uuid NOT NULL DEFAULT gen_random_uuid(),
  timezone text NOT NULL DEFAULT 'Europe/Warsaw',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.reminder_subscriptions TO service_role;
ALTER TABLE public.reminder_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.reminder_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.reminder_subscriptions(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  days_before integer NOT NULL,
  sent_on date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Warsaw')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, item_id, days_before, sent_on)
);

GRANT ALL ON public.reminder_sends TO service_role;
ALTER TABLE public.reminder_sends ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER reminder_subscriptions_updated_at
BEFORE UPDATE ON public.reminder_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();