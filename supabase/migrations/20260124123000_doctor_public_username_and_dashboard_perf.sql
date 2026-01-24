-- File: supabase/migrations/20260124123000_doctor_public_username_and_dashboard_perf.sql
begin;

alter table public.profiles
  add column if not exists username text;

alter table public.profiles
  add column if not exists profile_visibility text;

-- Normalize existing null/empty values
update public.profiles
set profile_visibility = 'public'
where profile_visibility is null or btrim(profile_visibility) = '';

-- Constrain allowed values
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_profile_visibility_chk'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_profile_visibility_chk
      check (profile_visibility in ('public','private'));
  end if;
end $$;

-- Username must be URL-safe: 3-30 chars, lowercase letters/numbers/underscore/dash, must start with alnum.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_username_format_chk'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_format_chk
      check (
        username is null
        or username ~ '^[a-z0-9][a-z0-9_-]{2,29}$'
      );
  end if;
end $$;

-- Public profiles must have a username.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_public_requires_username_chk'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_public_requires_username_chk
      check (profile_visibility <> 'public' or username is not null);
  end if;
end $$;

-- Case-insensitive uniqueness for usernames (so /doctor/DrJohn and /doctor/drjohn can't both exist)
create unique index if not exists idx_profiles_username_lower_unique
  on public.profiles ((lower(username)))
  where username is not null;

-- -----------------------------------------------------------------------------
-- Dashboard performance: indexes + RPCs (idempotent)
-- -----------------------------------------------------------------------------

create index if not exists idx_appointments_doctor_date_status
  on public.appointments (doctor_id, appointment_date, status);

create index if not exists idx_appointments_doctor_status
  on public.appointments (doctor_id, status);

create index if not exists idx_appointments_doctor_patient
  on public.appointments (doctor_id, patient_id);

-- Auth-scoped stats (used by client-side RPC if needed)
create or replace function public.doctor_dashboard_stats(p_doctor_id uuid)
returns table (
  total_patients int,
  completed_appointments int,
  active_services int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1
    from public.doctors d
    where d.id = p_doctor_id
      and d.user_id = uid
  ) then
    raise exception 'forbidden';
  end if;

  return query
  select
    (select count(distinct a.patient_id)::int
     from public.appointments a
     where a.doctor_id = p_doctor_id
       and coalesce(a.status,'') <> 'canceled'),
    (select count(*)::int
     from public.appointments a
     where a.doctor_id = p_doctor_id
       and a.status = 'completed'),
    (select count(*)::int
     from public.procedures p
     where p.dentist_id = p_doctor_id
       and coalesce(p.is_active, true) = true);
end $$;

grant execute on function public.doctor_dashboard_stats(uuid) to authenticated;

-- Service-role stats (used by edge functions; no auth.uid() dependency)
create or replace function public.doctor_dashboard_stats_admin(p_doctor_id uuid)
returns table (
  total_patients int,
  completed_appointments int,
  active_services int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(distinct a.patient_id)::int
     from public.appointments a
     where a.doctor_id = p_doctor_id
       and coalesce(a.status,'') <> 'canceled') as total_patients,
    (select count(*)::int
     from public.appointments a
     where a.doctor_id = p_doctor_id
       and a.status = 'completed') as completed_appointments,
    (select count(*)::int
     from public.procedures p
     where p.dentist_id = p_doctor_id
       and coalesce(p.is_active, true) = true) as active_services;
$$;

grant execute on function public.doctor_dashboard_stats_admin(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- Public doctor profile view (anon-safe) + update search view to respect visibility
-- -----------------------------------------------------------------------------

create or replace view public.doctor_public_profile_view as
select
  d.id,
  d.user_id,
  prf.username,
  d.custom_profile_link,
  prf.full_name,
  prf.avatar_url,
  prf.phone,
  prf.email,
  d.specialty,
  d.bio,
  d.languages,
  d.consultation_fee,
  d.verified,
  d.years_experience,
  d.average_rating,
  d.num_reviews,
  d.consultation_types,
  d.accepts_new_patients,
  pr.id as practice_id,
  pr.name as practice_name,
  pr.address as practice_address,
  pr.phone as practice_phone,
  pr.city as practice_city,
  pr.country as practice_country,
  pr.verified as practice_verified
from public.doctors d
join public.profiles prf on prf.user_id = d.user_id
left join public.practices pr on pr.id = d.practice_id
where coalesce(d.verified, false) = true
  and coalesce(prf.profile_visibility, 'public') = 'public';

grant select on public.doctor_public_profile_view to anon, authenticated;

create or replace view public.doctor_public_search_view as
select
  d.id,
  prf.full_name,
  prf.avatar_url,
  prf.username,
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
where coalesce(d.verified, false) = true
  and coalesce(prf.profile_visibility, 'public') = 'public';

grant select on public.doctor_public_search_view to anon, authenticated;

notify pgrst, 'reload schema';

commit;
