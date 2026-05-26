ALTER TABLE public.clinic_staff DROP CONSTRAINT IF EXISTS clinic_staff_status_check;
ALTER TABLE public.clinic_staff ADD CONSTRAINT clinic_staff_status_check
  CHECK (status IN ('active','inactive','on_leave','terminated','invited','pending','cancelled','removed'));

ALTER TABLE public.clinic_staff DROP CONSTRAINT IF EXISTS clinic_staff_staff_role_check;
ALTER TABLE public.clinic_staff ADD CONSTRAINT clinic_staff_staff_role_check
  CHECK (staff_role IN (
    'receptionist','nurse','billing_manager','assistant',
    'technician','hygienist','manager','other',
    'clinic_staff','clinic_admin','viewer'
  ));