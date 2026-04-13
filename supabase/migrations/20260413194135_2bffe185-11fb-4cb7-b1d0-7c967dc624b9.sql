CREATE OR REPLACE FUNCTION public.get_practice_locations(p_practice_id uuid)
RETURNS TABLE (
  id uuid,
  practice_id uuid,
  name varchar,
  address text,
  city varchar,
  state varchar,
  zip_code varchar,
  country varchar,
  phone varchar,
  email varchar,
  is_primary boolean,
  photo_urls text[],
  operating_hours jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  name_en varchar,
  name_ru varchar,
  name_uz varchar,
  name_ar varchar,
  address_en text,
  address_ru text,
  address_uz text,
  address_ar text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.id, pl.practice_id, pl.name, pl.address, pl.city, pl.state,
    pl.zip_code, pl.country, pl.phone, pl.email, pl.is_primary,
    pl.photo_urls, pl.operating_hours, pl.created_at, pl.updated_at,
    pl.name_en, pl.name_ru, pl.name_uz, pl.name_ar,
    pl.address_en, pl.address_ru, pl.address_uz, pl.address_ar
  FROM public.practice_locations pl
  WHERE pl.practice_id = p_practice_id
  ORDER BY pl.is_primary DESC, pl.name ASC;
END;
$$;