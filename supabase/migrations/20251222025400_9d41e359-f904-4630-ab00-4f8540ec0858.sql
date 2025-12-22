-- Add missing roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'clinic_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'clinic_staff';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pharmacy_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pharmacy_staff';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lab_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lab_staff';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'imaging_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'imaging_staff';