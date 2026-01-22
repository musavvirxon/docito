begin;

drop trigger if exists trg_doctor_verif_submissions_updated_at on public.doctor_verification_submissions;
drop trigger if exists trg_country_verif_profiles_updated_at on public.country_verification_profiles;

commit;
