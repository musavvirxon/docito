-- Create function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_primary_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'clinic_admin' THEN 3
      WHEN 'pharmacy_admin' THEN 4
      WHEN 'lab_admin' THEN 5
      WHEN 'imaging_admin' THEN 6
      WHEN 'doctor' THEN 7
      WHEN 'clinic_staff' THEN 8
      WHEN 'pharmacy_staff' THEN 9
      WHEN 'lab_staff' THEN 10
      WHEN 'imaging_staff' THEN 11
      WHEN 'receptionist' THEN 12
      WHEN 'nurse' THEN 13
      WHEN 'billing_manager' THEN 14
      WHEN 'pharmacist' THEN 15
      WHEN 'lab_technician' THEN 16
      WHEN 'internal_lab_tech' THEN 17
      WHEN 'internal_imaging_tech' THEN 18
      WHEN 'patient' THEN 19
      ELSE 20
    END
  LIMIT 1
$$;