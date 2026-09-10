CREATE OR REPLACE FUNCTION public.get_document_branding(_practice_id uuid)
RETURNS TABLE (
  practice_id uuid,
  name text,
  logo_url text,
  color_index int,
  address text,
  phone text,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    COALESCE(NULLIF(es.payload->'branding'->>'logo_url',''), NULLIF(p.logo_url,'')) AS logo_url,
    COALESCE((es.payload->'branding'->>'colorIndex')::int, 0) AS color_index,
    p.address,
    p.phone,
    p.email
  FROM public.practices p
  LEFT JOIN public.entity_settings es
    ON es.entity_id = p.id AND es.entity_type = 'practice'
  WHERE p.id = _practice_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_document_branding(uuid) TO authenticated, service_role;