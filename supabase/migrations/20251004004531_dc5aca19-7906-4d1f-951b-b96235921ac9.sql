-- Allow doctors to create guest patient profiles for manual bookings
-- This enables doctors to book appointments for walk-in patients without creating full auth accounts

-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Anyone can insert profile" ON public.profiles;

-- Create new policy that allows both self-registration and doctor-created guest patients
CREATE POLICY "Users can insert own profile or doctors can create guest patients"
ON public.profiles
FOR INSERT
WITH CHECK (
  -- Users can create their own profile
  auth.uid() = user_id
  OR
  -- Doctors can create guest patient profiles
  (
    role = 'patient' AND
    EXISTS (
      SELECT 1 FROM doctors d
      WHERE d.user_id = auth.uid()
    )
  )
);