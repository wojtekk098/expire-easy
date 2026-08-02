CREATE TYPE public.deadline_status AS ENUM ('pending', 'in_progress', 'confirmed', 'rescheduled', 'done');

CREATE TABLE public.deadlines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Inne',
  expiry_date date NOT NULL,
  notes text,
  reminder_days_before integer[] NOT NULL DEFAULT ARRAY[30,14,7,1],
  contact_name text,
  contact_email text,
  contact_phone text,
  status public.deadline_status NOT NULL DEFAULT 'pending',
  color_tag text,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_rule text,
  start_time time,
  end_time time,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deadlines TO authenticated;
GRANT ALL ON public.deadlines TO service_role;

ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deadlines" ON public.deadlines FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own deadlines" ON public.deadlines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own deadlines" ON public.deadlines FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own deadlines" ON public.deadlines FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX deadlines_user_expiry_idx ON public.deadlines (user_id, expiry_date);

CREATE TRIGGER deadlines_set_updated_at
BEFORE UPDATE ON public.deadlines
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();