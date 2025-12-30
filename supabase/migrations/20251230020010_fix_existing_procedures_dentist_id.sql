UPDATE public.procedures p
SET dentist_id = d.id
FROM public.doctors d
WHERE p.dentist_id = d.user_id;
