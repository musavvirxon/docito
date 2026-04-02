
DROP FUNCTION IF EXISTS public.get_practice_providers(UUID);

CREATE FUNCTION public.get_practice_providers(p_practice_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  specialty TEXT,
  avatar_url TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    d.id,
    COALESCE(pr.full_name, pr.email, 'Unknown') AS full_name,
    d.specialty,
    pr.avatar_url
  FROM doctors d
  LEFT JOIN profiles pr ON pr.user_id = d.user_id
  WHERE d.practice_id = p_practice_id;
$$;
