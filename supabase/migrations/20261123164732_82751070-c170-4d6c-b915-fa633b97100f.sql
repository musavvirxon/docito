-- Scope admin/staff RLS policies on search-related tables to authenticated users
-- so anonymous callers running homepage_unified_search do not trigger
-- authenticated-only SECURITY DEFINER helper functions (has_role, etc.).

ALTER POLICY "Super admins can view all doctors"
  ON public.doctors TO authenticated;

ALTER POLICY "Practice admins can view applicant doctors"
  ON public.doctors TO authenticated;

ALTER POLICY "Super admins can view all practices"
  ON public.practices TO authenticated;

ALTER POLICY "Super admins can manage all lab centers"
  ON public.lab_centers TO authenticated;

ALTER POLICY "Super admins can manage all pharmacies"
  ON public.pharmacies TO authenticated;

ALTER POLICY "Super admins can view all imaging centers"
  ON public.imaging_centers TO authenticated;

ALTER POLICY "Super admins can update imaging centers"
  ON public.imaging_centers TO authenticated;

ALTER POLICY "Super admins can view all profiles"
  ON public.profiles TO authenticated;

ALTER POLICY "Doctors can view patient profiles with recent appointments"
  ON public.profiles TO authenticated;

ALTER POLICY "Staff can view patient profiles for their practice"
  ON public.profiles TO authenticated;

ALTER POLICY "System can manage popular searches"
  ON public.popular_searches TO authenticated;