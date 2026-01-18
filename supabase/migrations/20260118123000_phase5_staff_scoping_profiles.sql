-- Path: supabase/migrations/20260118123000_phase5_staff_scoping_profiles.sql
-- Phase 5 (Staff scoping): Expand patient profile visibility for invited staff across
-- clinic, lab, imaging, and pharmacy contexts (DB-level RLS).

begin;

-- -----------------------------------------------------------------------------
-- Helper: Can the current user (staff/admin) view a given patient's profile?
-- -----------------------------------------------------------------------------
create or replace function public.staff_can_view_patient_profile(target_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or target_user_id is null then
    return false;
  end if;

  -- -----------------------------
  -- Clinic (practice) staff/admin
  -- -----------------------------
  if exists (
    select 1
    from public.clinic_staff cs
    join public.appointments a
      on a.practice_id = cs.practice_id
    where cs.user_id = uid
      and cs.status = 'active'
      and a.patient_id = target_user_id
  ) then
    return true;
  end if;

  if exists (
    select 1
    from public.practices p
    join public.appointments a
      on a.practice_id = p.id
    where p.admin_id = uid
      and a.patient_id = target_user_id
  ) then
    return true;
  end if;

  -- -----------------------------
  -- Lab staff/admin
  -- -----------------------------
  if to_regclass('public.test_orders') is not null then
    if exists (
      select 1
      from public.lab_staff ls
      join public.test_orders o
        on o.lab_center_id = ls.lab_center_id
      where ls.user_id = uid
        and ls.status = 'active'
        and o.patient_id = target_user_id
    ) then
      return true;
    end if;

    if exists (
      select 1
      from public.lab_centers lc
      join public.test_orders o
        on o.lab_center_id = lc.id
      where lc.admin_id = uid
        and o.patient_id = target_user_id
    ) then
      return true;
    end if;
  end if;

  -- -----------------------------
  -- Imaging staff/admin (via referrals)
  -- -----------------------------
  if to_regclass('public.referrals') is not null then
    if exists (
      select 1
      from public.imaging_staff isf
      join public.referrals r
        on r.receiver_entity_id = isf.imaging_center_id
      where isf.user_id = uid
        and isf.status = 'active'
        and r.receiver_type = 'imaging_center'
        and r.patient_id = target_user_id
    ) then
      return true;
    end if;

    if exists (
      select 1
      from public.imaging_centers ic
      join public.referrals r
        on r.receiver_entity_id = ic.id
      where ic.admin_id = uid
        and r.receiver_type = 'imaging_center'
        and r.patient_id = target_user_id
    ) then
      return true;
    end if;
  end if;

  -- -----------------------------
  -- Pharmacy staff/admin
  -- -----------------------------
  if to_regclass('public.prescriptions') is not null then
    if exists (
      select 1
      from public.pharmacy_staff ps
      join public.prescriptions pr
        on pr.pharmacy_id = ps.pharmacy_id
      where ps.user_id = uid
        and ps.status = 'active'
        and pr.patient_id = target_user_id
    ) then
      return true;
    end if;

    if exists (
      select 1
      from public.pharmacies ph
      join public.prescriptions pr
        on pr.pharmacy_id = ph.id
      where ph.admin_id = uid
        and pr.patient_id = target_user_id
    ) then
      return true;
    end if;
  end if;

  return false;
end;
$$;

grant execute on function public.staff_can_view_patient_profile(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Profiles RLS: Replace the staff visibility policy to use the expanded helper.
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Staff can view patient profiles for their practice" on public.profiles;

create policy "Staff can view patient profiles for their practice"
on public.profiles
for select
using (public.staff_can_view_patient_profile(user_id));

commit;
