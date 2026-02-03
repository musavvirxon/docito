-- Fix homepage_unified_search function - cast varchar to text
DROP FUNCTION IF EXISTS homepage_unified_search(text, text);

CREATE OR REPLACE FUNCTION homepage_unified_search(search_query text, search_location text)
RETURNS TABLE(
  id uuid,
  name text,
  type text,
  specialty text,
  location text,
  rating numeric,
  image_url text,
  verified boolean
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Search doctors
  SELECT 
    d.id,
    COALESCE(p.full_name, 'Unknown Doctor')::text as name,
    'doctor'::text as type,
    d.specialty::text,
    COALESCE(pr.city, '')::text as location,
    COALESCE(d.average_rating, 0)::numeric as rating,
    p.avatar_url::text as image_url,
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
     LOWER(COALESCE(pr.city, '')) ILIKE '%' || LOWER(search_location) || '%' OR
     LOWER(COALESCE(pr.country, '')) ILIKE '%' || LOWER(search_location) || '%')
  
  UNION ALL
  
  -- Search practices/clinics
  SELECT 
    pr.id,
    pr.name::text,
    'clinic'::text as type,
    COALESCE(array_to_string(pr.specialties, ', '), 'Clinic')::text as specialty,
    COALESCE(pr.city, '')::text as location,
    COALESCE(pr.average_rating, 0)::numeric as rating,
    pr.logo_url::text as image_url,
    COALESCE(pr.verified, false) as verified
  FROM practices pr
  WHERE 
    (search_query = '' OR 
     LOWER(pr.name) ILIKE '%' || LOWER(search_query) || '%' OR
     LOWER(COALESCE(array_to_string(pr.specialties, ' '), '')) ILIKE '%' || LOWER(search_query) || '%')
    AND
    (search_location = '' OR 
     LOWER(COALESCE(pr.city, '')) ILIKE '%' || LOWER(search_location) || '%' OR
     LOWER(COALESCE(pr.country, '')) ILIKE '%' || LOWER(search_location) || '%')
  
  UNION ALL
  
  -- Search labs
  SELECT 
    l.id,
    l.name::text,
    'lab'::text as type,
    COALESCE(l.type, 'Laboratory')::text as specialty,
    COALESCE(l.city, '')::text as location,
    0::numeric as rating,
    NULL::text as image_url,
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
    ph.name::text,
    'pharmacy'::text as type,
    'Pharmacy'::text as specialty,
    COALESCE(ph.city, '')::text as location,
    COALESCE(ph.average_rating, 0)::numeric as rating,
    ph.logo_url::text as image_url,
    COALESCE(ph.verified, false) as verified
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
    ic.name::text,
    'imaging'::text as type,
    COALESCE(array_to_string(ic.modalities, ', '), 'Imaging')::text as specialty,
    COALESCE(ic.city, '')::text as location,
    COALESCE(ic.average_rating, 0)::numeric as rating,
    NULL::text as image_url,
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
$$;