-- Fix 1: Recreate homepage_unified_search with correct column names
CREATE OR REPLACE FUNCTION public.homepage_unified_search(
  search_query text DEFAULT ''::text,
  search_location text DEFAULT ''::text
)
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
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Search doctors
  SELECT 
    d.id,
    COALESCE(p.full_name, 'Unknown Doctor') as name,
    'doctor'::text as type,
    d.specialty,
    COALESCE(pr.city, '') as location,
    COALESCE(d.average_rating, 0)::numeric as rating,
    p.avatar_url as image_url,
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
  
  -- Search practices/clinics (use verified column, not is_verified)
  SELECT 
    pr.id,
    pr.name,
    'clinic'::text as type,
    pr.specialty,
    COALESCE(pr.city, '') as location,
    COALESCE(pr.average_rating, 0)::numeric as rating,
    pr.logo_url as image_url,
    COALESCE(pr.verified, false) as verified
  FROM practices pr
  WHERE 
    (search_query = '' OR 
     LOWER(pr.name) ILIKE '%' || LOWER(search_query) || '%' OR
     LOWER(COALESCE(pr.specialty, '')) ILIKE '%' || LOWER(search_query) || '%')
    AND
    (search_location = '' OR 
     LOWER(COALESCE(pr.city, '')) ILIKE '%' || LOWER(search_location) || '%' OR
     LOWER(COALESCE(pr.country, '')) ILIKE '%' || LOWER(search_location) || '%')
  
  UNION ALL
  
  -- Search labs (use 'type' column properly - it exists in lab_centers)
  SELECT 
    l.id,
    l.name,
    'lab'::text as type,
    COALESCE(l.type, 'Laboratory') as specialty,
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
  
  -- Search pharmacies (use verified column, not is_verified)
  SELECT 
    ph.id,
    ph.name,
    'pharmacy'::text as type,
    'Pharmacy'::text as specialty,
    COALESCE(ph.city, '') as location,
    COALESCE(ph.average_rating, 0)::numeric as rating,
    ph.logo_url as image_url,
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
$$;

-- Fix 2: Create security definer function to check conversation participation (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_user_id uuid, p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
  );
$$;

-- Drop old problematic policies
DROP POLICY IF EXISTS "Users can view participants of their conversations or super_adm" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participation or super_admin" ON public.conversation_participants;
DROP POLICY IF EXISTS "Super admins can add participants" ON public.conversation_participants;

-- Create new safe RLS policies for conversation_participants (no recursion)
CREATE POLICY "View own participation or via security definer"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Update own participation"
ON public.conversation_participants
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Insert for super_admin or conversation creator"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND c.created_by = auth.uid()
  )
);

-- Fix 3: Fix notifications table missing entity_type column
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS entity_type text;

ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS entity_id uuid;