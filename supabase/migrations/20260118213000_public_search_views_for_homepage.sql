-- File: supabase/migrations/20260118213000_public_search_views_for_homepage.sql
-- Public search views (safe fields only) so homepage search works for anon users without exposing PII.

begin;

-- Doctors (safe public fields only)
create or replace view public.doctor_public_search_view as
select
  d.id,
  prf.full_name,
  prf.avatar_url,
  d.specialty,
  d.bio,
  d.languages,
  d.consultation_fee,
  coalesce(d.accepts_new_patients, true) as accepts_new_patients,
  coalesce(d.weighted_rating, d.average_rating) as rating,
  coalesce(d.num_reviews, 0) as num_reviews,
  coalesce(d.appointment_count, 0) as appointment_count,
  pr.id as practice_id,
  pr.name as practice_name,
  pr.city as practice_city,
  pr.country as practice_country
from public.doctors d
join public.profiles prf on prf.user_id = d.user_id
left join public.practices pr on pr.id = d.practice_id
where coalesce(d.verified, false) = true;

-- Clinics / Practices (safe public fields only)
create or replace view public.practice_public_search_view as
select
  p.id,
  p.name,
  p.logo_url,
  p.description,
  p.practice_type,
  p.specialties,
  p.city,
  p.country,
  coalesce(p.weighted_rating, p.average_rating) as rating,
  coalesce(p.num_reviews, 0) as num_reviews,
  coalesce(p.appointment_count, 0) as appointment_count
from public.practices p
where coalesce(p.verified, false) = true;

-- Pharmacies (safe public fields only)
create or replace view public.pharmacy_public_search_view as
select
  ph.id,
  ph.name,
  ph.logo_url,
  ph.city,
  ph.country,
  coalesce(ph.delivery_available, false) as delivery_available,
  coalesce(ph.accepts_insurance, false) as accepts_insurance,
  ph.average_rating as rating,
  coalesce(ph.num_reviews, 0) as num_reviews
from public.pharmacies ph
where coalesce(ph.verified, false) = true;

-- Labs / Imaging centers (safe public fields only)
create or replace view public.lab_center_public_search_view as
select
  lc.id,
  lc.name,
  lc.city,
  lc.country,
  coalesce(lc.accepts_insurance, false) as accepts_insurance,
  lc.services_offered,
  lc.accreditations,
  lc.average_turnaround_hours,
  lc.type
from public.lab_centers lc
where coalesce(lc.is_verified, false) = true;

grant select on public.doctor_public_search_view to anon, authenticated;
grant select on public.practice_public_search_view to anon, authenticated;
grant select on public.pharmacy_public_search_view to anon, authenticated;
grant select on public.lab_center_public_search_view to anon, authenticated;

-- Force PostgREST schema cache reload (helps Lovable preview)
notify pgrst, 'reload schema';

commit;
