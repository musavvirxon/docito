-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile or doctors can create guest patien" ON public.profiles;

-- Create a new INSERT policy that allows:
-- 1. Users to insert their own profile (auth.uid() = user_id)
-- 2. Doctors to insert guest patient profiles (role = 'patient' AND current user is a doctor)
CREATE POLICY "Users can insert own profile or doctors can create patients"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow users to insert their own profile
  (auth.uid() = user_id)
  OR
  -- Allow doctors to insert patient profiles (guest patients)
  (
    role = 'patient'::user_role 
    AND EXISTS (
      SELECT 1 FROM doctors d 
      WHERE d.user_id = auth.uid()
    )
  )
);