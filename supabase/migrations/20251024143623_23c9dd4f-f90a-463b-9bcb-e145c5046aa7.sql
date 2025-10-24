-- Fix Info-Level Security Issues
-- 1. Restrict practice_locations public exposure
-- 2. Add admin checks to utility functions

-- ============================================
-- 1. Practice Locations: Create Minimal Public View
-- ============================================

-- Create a minimal public view with only essential booking info
CREATE VIEW public.public_practice_locations AS
SELECT 
  id,
  practice_id,
  name,
  city,
  state,
  country,
  is_primary
FROM practice_locations;

-- Grant access to anonymous users for the minimal view
GRANT SELECT ON public.public_practice_locations TO anon;
GRANT SELECT ON public.public_practice_locations TO authenticated;

-- Remove the public policy from the main table
DROP POLICY IF EXISTS "Anyone can view practice locations" ON practice_locations;

-- Create new policy: authenticated users can view full details
CREATE POLICY "Authenticated users can view location details"
ON practice_locations FOR SELECT
TO authenticated
USING (true);

-- Practice admins can still manage their locations (existing policy remains)
-- "Practice admins can manage their locations" policy already exists

-- ============================================
-- 2. Add Admin Checks to Utility Functions
-- ============================================

-- Add admin check to refresh_all_ratings (called by edge function)
CREATE OR REPLACE FUNCTION public.refresh_all_ratings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow admins or scheduled jobs (auth.uid() is NULL for cron/edge function service role)
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required to refresh ratings';
  END IF;
  
  PERFORM update_appointment_counts();
  PERFORM update_doctor_weighted_ratings();
  PERFORM update_practice_weighted_ratings();
END;
$function$;

-- Add admin check to update_doctor_weighted_ratings
CREATE OR REPLACE FUNCTION public.update_doctor_weighted_ratings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  global_avg_rating DECIMAL(3,2);
  minimum_threshold INTEGER := 10;
BEGIN
  -- Only allow admins or system calls (auth.uid() is NULL)
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required to update ratings';
  END IF;
  
  -- Calculate global average rating for doctors with reviews
  SELECT COALESCE(AVG(average_rating), 4.0) INTO global_avg_rating
  FROM doctors 
  WHERE num_reviews > 0;
  
  -- Update weighted ratings using Bayesian formula
  UPDATE doctors SET
    weighted_rating = (
      (num_reviews::decimal / (num_reviews + minimum_threshold)) * average_rating +
      (minimum_threshold::decimal / (num_reviews + minimum_threshold)) * global_avg_rating
    )
  WHERE average_rating > 0 OR num_reviews > 0;
  
  -- Set default weighted rating for doctors with no ratings
  UPDATE doctors SET
    weighted_rating = global_avg_rating * 0.7  -- Slightly lower than global average
  WHERE num_reviews = 0 AND average_rating = 0;
END;
$function$;

-- Add admin check to update_practice_weighted_ratings
CREATE OR REPLACE FUNCTION public.update_practice_weighted_ratings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  global_avg_rating DECIMAL(3,2);
  minimum_threshold INTEGER := 10;
BEGIN
  -- Only allow admins or system calls (auth.uid() is NULL)
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required to update ratings';
  END IF;
  
  -- Calculate global average rating for practices with reviews
  SELECT COALESCE(AVG(average_rating), 4.0) INTO global_avg_rating
  FROM practices 
  WHERE num_reviews > 0;
  
  -- Update weighted ratings using Bayesian formula
  UPDATE practices SET
    weighted_rating = (
      (num_reviews::decimal / (num_reviews + minimum_threshold)) * average_rating +
      (minimum_threshold::decimal / (num_reviews + minimum_threshold)) * global_avg_rating
    )
  WHERE average_rating > 0 OR num_reviews > 0;
  
  -- Set default weighted rating for practices with no ratings
  UPDATE practices SET
    weighted_rating = global_avg_rating * 0.7  -- Slightly lower than global average
  WHERE num_reviews = 0 AND average_rating = 0;
END;
$function$;

-- Add admin check to update_appointment_counts
CREATE OR REPLACE FUNCTION public.update_appointment_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow admins or system calls (auth.uid() is NULL)
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required to update appointment counts';
  END IF;
  
  -- Update doctor appointment counts
  UPDATE doctors SET
    appointment_count = (
      SELECT COUNT(*)
      FROM appointments a
      WHERE a.doctor_id = doctors.id
      AND a.status IN ('confirmed', 'completed')
    );
  
  -- Update practice appointment counts
  UPDATE practices SET
    appointment_count = (
      SELECT COUNT(*)
      FROM appointments a
      WHERE a.practice_id = practices.id
      AND a.status IN ('confirmed', 'completed')
    );
END;
$function$;