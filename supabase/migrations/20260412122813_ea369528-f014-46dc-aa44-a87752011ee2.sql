
-- Create entity_settings table
CREATE TABLE IF NOT EXISTS public.entity_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);

ALTER TABLE public.entity_settings ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can read
CREATE POLICY "Authenticated users can read entity settings"
  ON public.entity_settings FOR SELECT TO authenticated
  USING (true);

-- RLS: authenticated users can insert
CREATE POLICY "Authenticated users can insert entity settings"
  ON public.entity_settings FOR INSERT TO authenticated
  WITH CHECK (true);

-- RLS: authenticated users can update
CREATE POLICY "Authenticated users can update entity settings"
  ON public.entity_settings FOR UPDATE TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_entity_settings_updated_at
  BEFORE UPDATE ON public.entity_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- get_entity_settings function
CREATE OR REPLACE FUNCTION public.get_entity_settings(
  p_entity_type text,
  p_entity_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT payload
  FROM public.entity_settings
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
  LIMIT 1;
$$;

-- upsert_entity_settings function
CREATE OR REPLACE FUNCTION public.upsert_entity_settings(
  p_entity_type text,
  p_entity_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  INSERT INTO public.entity_settings (entity_type, entity_id, payload)
  VALUES (p_entity_type, p_entity_id, p_payload)
  ON CONFLICT (entity_type, entity_id)
  DO UPDATE SET payload = p_payload, updated_at = now()
  RETURNING payload INTO result;

  RETURN result;
END;
$$;
