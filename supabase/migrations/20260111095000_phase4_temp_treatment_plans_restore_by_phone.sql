-- Phase 4: Temporary (7-day) treatment plans for doctor-added patients + restore on signup/phone match
-- Requirements:
-- 1) Referrals remain unavailable for non-signed-up patients (keep referrals.patient_id -> auth.users).
-- 2) Treatment plans can be created for doctor-added patients (treatment_plans.doctor_patient_id),
--    but MUST expire after 7 days.
-- 3) If a patient signs up using the SAME phone, or later adds SAME phone to their profile,
--    restore the plan (if not expired) and restore medical/dental history from doctor_patients,
--    IF that doctor_patient record was not deleted / inactive.

set check_function_bodies = off;

------------------------------
-- A) Normalize phone helper
------------------------------
create or replace function public.normalize_phone(p text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '');
$$;

------------------------------
-- B) Ensure profiles has fields to restore health history into
-- (safe even if columns already exist)
------------------------------
alter table public.profiles add column if not exists allergies text;
alter table public.profiles add column if not exists medical_history text;
alter table public.profiles add column if not exists dental_history text;
alter table public.profiles add column if not exists current_medications text;
alter table public.profiles add column if not exists emergency_contact_name text;
alter table public.profiles add column if not exists emergency_contact_phone text;

------------------------------
-- C) Ensure doctor_patients has source fields (if your table already has these, no changes)
-- If you already store medical/dental history under different column names,
-- update the restore query below accordingly.
------------------------------
alter table public.doctor_patients add column if not exists allergies text;
alter table public.doctor_patients add column if not exists medical_history text;
alter table public.doctor_patients add column if not exists dental_history text;
alter table public.doctor_patients add column if not exists current_medications text;
alter table public.doctor_patients add column if not exists emergency_contact_name text;
alter table public.doctor_patients add column if not exists emergency_contact_phone text;

-- Optional: status field to mark inactive/removed patients without deleting row
alter table public.doctor_patients add column if not exists status text default 'active';

------------------------------
-- D) Add expires_at to treatment_plans and trigger to enforce 7-day expiry for doctor_patient_id plans
------------------------------
alter table public.treatment_plans
  add column if not exists expires_at timestamptz;

create or replace function public.set_treatment_plan_expiry()
returns trigger
language plpgsql
as $$
begin
  -- If this plan targets a doctor-added patient (not signed-up), set expiry for 7 days
  if NEW.doctor_patient_id is not null and NEW.patient_id is null then
    if NEW.expires_at is null then
      NEW.expires_at := now() + interval '7 days';
    end if;
  else
    -- If linked to registered patient, it should not expire
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

create index if not exists idx_treatment_plans_expires_at
  on public.treatment_plans(expires_at);

------------------------------
-- E) Restore function:
-- Given (user_id, phone), restore:
-- 1) profile health history from doctor_patients (fill only missing fields)
-- 2) any NOT-expired temporary treatment plans from doctor_patient_id -> patient_id
------------------------------
create or replace function public.link_doctor_patient_data_by_phone(p_user_id uuid, p_phone text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  norm text;
  dp_id uuid;
begin
  norm := public.normalize_phone(p_phone);
  if norm is null then
    return;
  end if;

  -- Pick the latest active doctor_patient with matching phone
  select id into dp_id
  from public.doctor_patients
  where public.normalize_phone(phone) = norm
    and coalesce(status, 'active') = 'active'
  order by updated_at desc nulls last
  limit 1;

  if dp_id is null then
    return;
  end if;

  -- (1) Restore health history into profiles: only fill blanks
  update public.profiles pr
  set
    allergies = coalesce(nullif(pr.allergies, ''), (select allergies from public.doctor_patients where id = dp_id)),
    medical_history = coalesce(nullif(pr.medical_history, ''), (select medical_history from public.doctor_patients where id = dp_id)),
    dental_history = coalesce(nullif(pr.dental_history, ''), (select dental_history from public.doctor_patients where id = dp_id)),
    current_medications = coalesce(nullif(pr.current_medications, ''), (select current_medications from public.doctor_patients where id = dp_id)),
    emergency_contact_name = coalesce(nullif(pr.emergency_contact_name, ''), (select emergency_contact_name from public.doctor_patients where id = dp_id)),
    emergency_contact_phone = coalesce(nullif(pr.emergency_contact_phone, ''), (select emergency_contact_phone from public.doctor_patients where id = dp_id))
  where pr.user_id = p_user_id;

  -- (2) Restore NOT-expired treatment plans for this doctor_patient
  update public.treatment_plans tp
  set
    patient_id = p_user_id,
    doctor_patient_id = null,
    expires_at = null
  where tp.patient_id is null
    and tp.doctor_patient_id = dp_id
    and (tp.expires_at is null or tp.expires_at > now());

end;
$$;

------------------------------
-- F) Trigger on profiles to auto-link when phone is inserted/updated
------------------------------
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
-- G) Cleanup function to delete expired temporary treatment plans
-- If pg_cron is enabled, schedule daily cleanup.
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

-- Optional cron scheduling (safe: won't fail hard if not allowed)
DO $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    null;
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      if not exists (select 1 from cron.job where jobname = 'cleanup_temp_treatment_plans') then
        perform cron.schedule(
          'cleanup_temp_treatment_plans',
          '30 3 * * *',
          $$select public.delete_expired_temporary_treatment_plans();$$
        );
      end if;
    exception when others then
      null;
    end;
  end if;
end;
$$;
