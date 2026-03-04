CREATE TABLE public.marketing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  page_path text,
  referrer text,
  user_agent text,
  ip inet,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.marketing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert marketing events"
ON public.marketing_events FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can select marketing events"
ON public.marketing_events FOR SELECT
TO service_role
USING (true);