-- Add username and profile visibility settings to profiles and doctors tables

-- Add username to profiles table (must be unique)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private'));

-- Add username to doctors table for easier querying
ALTER TABLE public.doctors
ADD COLUMN IF NOT EXISTS custom_profile_link TEXT UNIQUE;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_doctors_custom_profile_link ON public.doctors(custom_profile_link);

-- Add comment
COMMENT ON COLUMN public.profiles.username IS 'Unique username for the doctor profile URL';
COMMENT ON COLUMN public.profiles.profile_visibility IS 'Profile visibility: public (searchable) or private (link-only)';
COMMENT ON COLUMN public.doctors.custom_profile_link IS 'Custom unique link for the doctor profile (can be username or random string)';