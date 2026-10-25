CREATE OR REPLACE FUNCTION public.get_public_doctor_procedures(_doctor_id uuid, _bookable_only boolean DEFAULT false)
RETURNS TABLE(
  id uuid,
  dentist_id uuid,
  name text,
  description text,
  category text,
  type text,
  default_cost numeric,
  price numeric,
  currency text,
  duration_minutes integer,
  is_bookable boolean,
  deposit_required boolean,
  deposit_amount numeric,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    pr.id,
    pr.dentist_id,
    pr.name::text,
    pr.description,
    pr.category,
    pr.type::text,
    pr.default_cost,
    pr.price,
    pr.currency,
    pr.duration_minutes,
    pr.is_bookable,
    pr.deposit_required,
    pr.deposit_amount,
    pr.created_at
  FROM public.procedures pr
  JOIN public.doctors d ON d.id = pr.dentist_id
  LEFT JOIN public.profiles p ON p.user_id = d.user_id
  WHERE pr.dentist_id = _doctor_id
    AND COALESCE(pr.is_active, true) = true
    AND (NOT _bookable_only OR COALESCE(pr.is_bookable, true) = true)
    AND (
      COALESCE(p.profile_visibility, 'public') <> 'private'
      OR d.user_id = auth.uid()
    )
  ORDER BY pr.name ASC
  LIMIT 500;
$$;

REVOKE ALL ON FUNCTION public.get_public_doctor_procedures(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_doctor_procedures(uuid, boolean) TO anon, authenticated;

ALTER TABLE public.procedures REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'procedures'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.procedures;
  END IF;
END $$;