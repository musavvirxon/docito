-- Create the homepage_unified_search RPC function
CREATE OR REPLACE FUNCTION public.homepage_unified_search(
  search_query text DEFAULT '',
  search_location text DEFAULT ''
)
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  specialty text,
  location text,
  rating numeric,
  image_url text,
  verified boolean
) AS $$
BEGIN
  RETURN QUERY
  -- Search doctors
  SELECT 
    d.id,
    COALESCE(p.full_name, 'Unknown Doctor') as name,
    'doctor'::text as type,
    d.specialty,
    COALESCE(p.city, pr.city, '') as location,
    COALESCE(d.average_rating, 0)::numeric as rating,
    p.profile_photo_url as image_url,
    COALESCE(d.verified, false) as verified
  FROM doctors d
  LEFT JOIN profiles p ON d.user_id = p.user_id
  LEFT JOIN practices pr ON d.practice_id = pr.id
  WHERE 
    (search_query = '' OR 
     LOWER(COALESCE(p.full_name, '')) ILIKE '%' || LOWER(search_query) || '%' OR
     LOWER(d.specialty) ILIKE '%' || LOWER(search_query) || '%')
    AND
    (search_location = '' OR 
     LOWER(COALESCE(p.city, '')) ILIKE '%' || LOWER(search_location) || '%' OR
     LOWER(COALESCE(pr.city, '')) ILIKE '%' || LOWER(search_location) || '%')
  
  UNION ALL
  
  -- Search practices/clinics
  SELECT 
    pr.id,
    pr.name,
    'clinic'::text as type,
    pr.specialty,
    COALESCE(pr.city, '') as location,
    COALESCE(pr.average_rating, 0)::numeric as rating,
    pr.logo_url as image_url,
    COALESCE(pr.is_verified, false) as verified
  FROM practices pr
  WHERE 
    (search_query = '' OR 
     LOWER(pr.name) ILIKE '%' || LOWER(search_query) || '%' OR
     LOWER(COALESCE(pr.specialty, '')) ILIKE '%' || LOWER(search_query) || '%')
    AND
    (search_location = '' OR 
     LOWER(COALESCE(pr.city, '')) ILIKE '%' || LOWER(search_location) || '%')
  
  UNION ALL
  
  -- Search labs
  SELECT 
    l.id,
    l.name,
    'lab'::text as type,
    l.type as specialty,
    COALESCE(l.city, '') as location,
    0::numeric as rating,
    NULL as image_url,
    COALESCE(l.is_verified, false) as verified
  FROM lab_centers l
  WHERE 
    (search_query = '' OR 
     LOWER(l.name) ILIKE '%' || LOWER(search_query) || '%')
    AND
    (search_location = '' OR 
     LOWER(COALESCE(l.city, '')) ILIKE '%' || LOWER(search_location) || '%')
  
  UNION ALL
  
  -- Search pharmacies
  SELECT 
    ph.id,
    ph.name,
    'pharmacy'::text as type,
    'Pharmacy'::text as specialty,
    COALESCE(ph.city, '') as location,
    COALESCE(ph.average_rating, 0)::numeric as rating,
    ph.logo_url as image_url,
    COALESCE(ph.is_verified, false) as verified
  FROM pharmacies ph
  WHERE 
    (search_query = '' OR 
     LOWER(ph.name) ILIKE '%' || LOWER(search_query) || '%')
    AND
    (search_location = '' OR 
     LOWER(COALESCE(ph.city, '')) ILIKE '%' || LOWER(search_location) || '%')
  
  UNION ALL
  
  -- Search imaging centers
  SELECT 
    ic.id,
    ic.name,
    'imaging'::text as type,
    array_to_string(ic.modalities, ', ') as specialty,
    COALESCE(ic.city, '') as location,
    COALESCE(ic.average_rating, 0)::numeric as rating,
    NULL as image_url,
    COALESCE(ic.is_verified, false) as verified
  FROM imaging_centers ic
  WHERE 
    (search_query = '' OR 
     LOWER(ic.name) ILIKE '%' || LOWER(search_query) || '%')
    AND
    (search_location = '' OR 
     LOWER(COALESCE(ic.city, '')) ILIKE '%' || LOWER(search_location) || '%')
  
  LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;