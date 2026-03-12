ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.imaging_centers ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.lab_centers ADD COLUMN IF NOT EXISTS logo_url text;