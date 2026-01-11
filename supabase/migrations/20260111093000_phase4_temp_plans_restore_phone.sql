-- Phase 4:
-- - Referrals remain unavailable for non-signed-up patients (referrals.patient_id -> auth.users).
-- - Treatment plans can be created for doctor-added patients (treatment_plans.doctor_patient_id),
--   but expire after 7 days unless the patient signs up and we can link by phone.
-- - When a user signs up (or later adds the same phone number to their profile),
--   we restore treatment plans (if not expired) and restore medical/dental history.

------------------------------
-- 1) Add health history fields to profiles (so signed-up patients can store/restore them)
------------------------------

alter table public.profiles add column if not exists allergies text;
alter table public.profiles add column if not exists medical_history text;
alter table public.profiles add column if not exists dental_history text;
alter table public.profiles add column if not exists current_medications text;
alter table public.profiles add column if not exists emergency_contact_name text;
alter table public.profiles add column if not exists emergency_contact_phone text;

------------------------------
-- 2) Add expiry to temporary treatment plans (doctor_patient_id-based)
------------------------------

alter table public.treatment_plans add column if not exists expires_at timestamptz;

create or replace function public.normalize_phone(p text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '');
$$;

create or replace function public.set_treatment_plan_expiry()
returns trigger
language plpgsql
as $$
begin
  -- If this plan targets a doctor-added patient, set a 7-day expiry by default.
  if NEW.doctor_patient_id is not null and NEW.patient_id is null then
    if NEW.expires_at is null then
      NEW.expires_at := now() + interval '7 days';
    end if;
  else
    -- If the plan is linked to a real signed-up patient, it should not expire.
    NEW.expires_at := null;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_treatment_plans_expiry on public.treatment_plans;
create trigger trg_treatment_plans_expiry
before insert or update of doctor_patient_id, patient_id
on public.treatment_plans
for each row
execute function public.set_treatment_plan_expiry();

------------------------------
-- 3) Link doctor_patients -> profiles by phone and restore data
------------------------------

create or replace function public.link_doctor_patient_data_by_phone(p_user_id uuid, p_phone text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  norm text;
begin
  norm := public.normalize_phone(p_phone);
  if norm is null then
    return;
  end if;

  -- (A) Restore medical/dental history into the signed-up profile
  -- Prefer existing profile values; only fill blanks.
  with dp as (
    select *
    from public.doctor_patients
    where public.normalize_phone(phone) = norm
      and coalesce(status, 'active') = 'active'
    order by updated_at desc
    limit 1
  )
  update public.profiles pr
  set
    allergies = coalesce(nullif(pr.allergies, ''), (select allergies from dp)),
    medical_history = coalesce(nullif(pr.medical_history, ''), (select medical_history from dp)),
    dental_history = coalesce(nullif(pr.dental_history, ''), (select dental_history from dp)),
    current_medications = coalesce(nullif(pr.current_medications, ''), (select current_medications from dp)),
    emergency_contact_name = coalesce(nullif(pr.emergency_contact_name, ''), (select emergency_contact_name from dp)),
    emergency_contact_phone = coalesce(nullif(pr.emergency_contact_phone, ''), (select emergency_contact_phone from dp))
  where pr.user_id = p_user_id
    and exists (select 1 from dp);

  -- (B) Restore treatment plans (ONLY if still within the 7-day window)
  update public.treatment_plans tp
  set
    patient_id = p_user_id,
    doctor_patient_id = null,
    expires_at = null
  where tp.patient_id is null
    and tp.doctor_patient_id in (
      select id
      from public.doctor_patients
      where public.normalize_phone(phone) = norm
    )
    and (tp.expires_at is null or tp.expires_at > now());
end;
$$;

create or replace function public.tg_link_doctor_patient_on_profile_phone()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if NEW.user_id is not null and NEW.phone is not null then
    perform public.link_doctor_patient_data_by_phone(NEW.user_id, NEW.phone);
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_profiles_link_by_phone_ins on public.profiles;
create trigger trg_profiles_link_by_phone_ins
after insert on public.profiles
for each row
execute function public.tg_link_doctor_patient_on_profile_phone();

drop trigger if exists trg_profiles_link_by_phone_upd on public.profiles;
create trigger trg_profiles_link_by_phone_upd
after update of phone on public.profiles
for each row
when (NEW.phone is distinct from OLD.phone)
execute function public.tg_link_doctor_patient_on_profile_phone();

------------------------------
-- 4) Cleanup expired temporary treatment plans
------------------------------

create or replace function public.delete_expired_temporary_treatment_plans()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.treatment_plans
  where doctor_patient_id is not null
    and expires_at is not null
    and expires_at <= now();
$$;

-- Optional: schedule cleanup via pg_cron (if enabled on your Supabase project)
DO $$
begin
  -- Create extension if permitted
  begin
    create extension if not exists pg_cron;
  exception when others then
    -- ignore if not permitted
    null;
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      -- Avoid duplicates
      if not exists (select 1 from cron.job where jobname = 'cleanup_temp_treatment_plans') then
        perform cron.schedule(
          'cleanup_temp_treatment_plans',
          '30 3 * * *',
          $$select public.delete_expired_temporary_treatment_plans();$$
        );
      end if;
    exception when others then
      -- Some projects may restrict access to cron.job
      null;
    end;
  end if;
end;
$$;
