
-- Drop the redundant FK constraint that references profiles
-- doctors.user_id already references auth.users(id) via doctors_user_id_fkey
-- This constraint causes signup failures because the profile doesn't exist yet when the doctor trigger runs
ALTER TABLE public.doctors DROP CONSTRAINT IF EXISTS fk_doctors_user_id;
