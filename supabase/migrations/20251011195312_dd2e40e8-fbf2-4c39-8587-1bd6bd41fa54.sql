-- Add admin_id to practices table to link practice to admin user
ALTER TABLE public.practices
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_practices_admin_id ON public.practices(admin_id);

-- Update RLS policies for practices
DROP POLICY IF EXISTS "Admins can manage their own practice" ON public.practices;
DROP POLICY IF EXISTS "Admins can view their own practice" ON public.practices;

CREATE POLICY "Admins can view their own practice"
ON public.practices
FOR SELECT
TO authenticated
USING (admin_id = auth.uid() OR EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Admins can update their own practice"
ON public.practices
FOR UPDATE
TO authenticated
USING (admin_id = auth.uid())
WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Admins can insert their own practice"
ON public.practices
FOR INSERT
TO authenticated
WITH CHECK (admin_id = auth.uid());

-- Create function to get practice statistics
CREATE OR REPLACE FUNCTION public.get_practice_stats(p_practice_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats JSON;
  v_total_bookings INTEGER;
  v_total_patients INTEGER;
  v_total_revenue NUMERIC;
  v_pending_invites INTEGER;
  v_total_doctors INTEGER;
BEGIN
  -- Get total bookings
  SELECT COUNT(*) INTO v_total_bookings
  FROM appointments
  WHERE practice_id = p_practice_id
  AND status IN ('confirmed', 'completed');
  
  -- Get unique patients
  SELECT COUNT(DISTINCT patient_id) INTO v_total_patients
  FROM appointments
  WHERE practice_id = p_practice_id
  AND status IN ('confirmed', 'completed');
  
  -- Calculate revenue (from completed appointments)
  SELECT COALESCE(SUM(d.consultation_fee), 0) INTO v_total_revenue
  FROM appointments a
  JOIN doctors d ON d.id = a.doctor_id
  WHERE a.practice_id = p_practice_id
  AND a.status = 'completed';
  
  -- Get pending join requests
  SELECT COUNT(*) INTO v_pending_invites
  FROM practice_join_requests
  WHERE practice_id = p_practice_id
  AND status = 'pending';
  
  -- Get total doctors
  SELECT COUNT(*) INTO v_total_doctors
  FROM doctors
  WHERE practice_id = p_practice_id;
  
  -- Build result
  v_stats := json_build_object(
    'total_bookings', COALESCE(v_total_bookings, 0),
    'total_patients', COALESCE(v_total_patients, 0),
    'total_revenue', COALESCE(v_total_revenue, 0),
    'pending_invites', COALESCE(v_pending_invites, 0),
    'total_doctors', COALESCE(v_total_doctors, 0)
  );
  
  RETURN v_stats;
END;
$$;