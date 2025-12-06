-- Fix: Restrict doctor profile creation to authenticated users only
DROP POLICY IF EXISTS "Anyone can insert doctor profile" ON public.doctors;

CREATE POLICY "Authenticated users can insert their own doctor profile"
ON public.doctors FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);