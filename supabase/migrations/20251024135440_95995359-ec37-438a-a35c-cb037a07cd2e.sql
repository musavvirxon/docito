-- Fix doctor_profiles_view to use security invoker
ALTER VIEW public.doctor_profiles_view SET (security_invoker = true);

-- Fix patient_all_appointments to use security invoker  
ALTER VIEW public.patient_all_appointments SET (security_invoker = true);