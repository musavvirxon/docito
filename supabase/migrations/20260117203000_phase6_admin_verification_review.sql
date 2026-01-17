-- Path: supabase/migrations/20260117203000_phase6_admin_verification_review.sql
begin;

-- -----------------------------------------------------------------------------
-- Super admin helper (stable, SECURITY DEFINER)
-- -----------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select has_role(auth.uid(), 'super_admin');
$$;

grant execute on function public.is_super_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- Ensure entity tables have verification + lock fields (idempotent)
-- -----------------------------------------------------------------------------
alter table if exists public.practices
  add column if not exists verified boolean not null default false,
  add column if not exists verification_status text not null default 'draft',
  add column if not exists locked boolean not null default false;

alter table if exists public.lab_centers
  add column if not exists verified boolean not null default false,
  add column if not exists verification_status text not null default 'draft',
  add column if not exists locked boolean not null default false;

alter table if exists public.imaging_centers
  add column if not exists verified boolean not null default false,
  add column if not exists verification_status text not null default 'draft',
  add column if not exists locked boolean not null default false;

alter table if exists public.pharmacies
  add column if not exists verified boolean not null default false,
  add column if not exists verification_status text not null default 'draft',
  add column if not exists locked boolean not null default false;

-- -----------------------------------------------------------------------------
-- Extend verification_submissions with review fields (idempotent)
-- -----------------------------------------------------------------------------
alter table if exists public.verification_submissions
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists rejection_reason text;

-- -----------------------------------------------------------------------------
-- Tighten RLS for admin review actions
-- -----------------------------------------------------------------------------
alter table if exists public.verification_submissions enable row level security;

drop policy if exists "Verification: super admin can read all" on public.verification_submissions;
drop policy if exists "Verification: super admin can update submitted" on public.verification_submissions;

create policy "Verification: super admin can read all"
on public.verification_submissions
for select
using (public.is_super_admin());

create policy "Verification: super admin can update submitted"
on public.verification_submissions
for update
using (
  public.is_super_admin()
  and status in ('submitted','approved','rejected')
)
with check (public.is_super_admin());

-- Keep existing entity-scoped policies as-is (Phase 5), these add super-admin override.

-- -----------------------------------------------------------------------------
-- Propagate verification decision to entity tables (approved/rejected/submitted)
-- -----------------------------------------------------------------------------
create or replace function public.trg_verification_propagate_entity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_status text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if coalesce(old.status,'') = coalesce(new.status,'') then
    return new;
  end if;

  next_status := coalesce(new.status, 'draft');

  if next_status = 'submitted' then
    if new.entity_type = 'clinic' then
      update public.practices
        set verification_status = 'submitted'
      where id = new.entity_id;
    elsif new.entity_type = 'lab' then
      update public.lab_centers
        set verification_status = 'submitted'
      where id = new.entity_id;
    elsif new.entity_type = 'imaging' then
      update public.imaging_centers
        set verification_status = 'submitted'
      where id = new.entity_id;
    elsif new.entity_type = 'pharmacy' then
      update public.pharmacies
        set verification_status = 'submitted'
      where id = new.entity_id;
    end if;

    return new;
  end if;

  if next_status = 'approved' then
    if new.entity_type = 'clinic' then
      update public.practices
        set verified = true, verification_status = 'approved', locked = false
      where id = new.entity_id;
    elsif new.entity_type = 'lab' then
      update public.lab_centers
        set verified = true, verification_status = 'approved', locked = false
      where id = new.entity_id;
    elsif new.entity_type = 'imaging' then
      update public.imaging_centers
        set verified = true, verification_status = 'approved', locked = false
      where id = new.entity_id;
    elsif new.entity_type = 'pharmacy' then
      update public.pharmacies
        set verified = true, verification_status = 'approved', locked = false
      where id = new.entity_id;
    end if;

    return new;
  end if;

  if next_status = 'rejected' then
    if new.entity_type = 'clinic' then
      update public.practices
        set verified = false, verification_status = 'rejected', locked = true
      where id = new.entity_id;
    elsif new.entity_type = 'lab' then
      update public.lab_centers
        set verified = false, verification_status = 'rejected', locked = true
      where id = new.entity_id;
    elsif new.entity_type = 'imaging' then
      update public.imaging_centers
        set verified = false, verification_status = 'rejected', locked = true
      where id = new.entity_id;
    elsif new.entity_type = 'pharmacy' then
      update public.pharmacies
        set verified = false, verification_status = 'rejected', locked = true
      where id = new.entity_id;
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_verification_propagate_entity on public.verification_submissions;
create trigger trg_verification_propagate_entity
after update on public.verification_submissions
for each row
execute function public.trg_verification_propagate_entity();

-- -----------------------------------------------------------------------------
-- Audit decision events (approved/rejected) via existing audit_write (Phase 5)
-- -----------------------------------------------------------------------------
create or replace function public.trg_verification_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if coalesce(old.status,'') = coalesce(new.status,'') then
    return new;
  end if;

  meta := jsonb_build_object(
    'submission_id', new.id,
    'entity_type', new.entity_type,
    'entity_id', new.entity_id,
    'old_status', old.status,
    'new_status', new.status,
    'reviewed_by', new.reviewed_by,
    'reviewed_at', new.reviewed_at,
    'rejection_reason', new.rejection_reason
  );

  if new.status = 'approved' then
    perform public.audit_write('verification.approved', new.entity_type, new.entity_id, 'verification_submission', new.id, meta);
  elsif new.status = 'rejected' then
    perform public.audit_write('verification.rejected', new.entity_type, new.entity_id, 'verification_submission', new.id, meta);
  elsif new.status = 'submitted' then
    perform public.audit_write('verification.submitted', new.entity_type, new.entity_id, 'verification_submission', new.id, meta);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_verification_audit on public.verification_submissions;
create trigger trg_verification_audit
after update on public.verification_submissions
for each row
execute function public.trg_verification_audit();

select pg_notify('pgrst', 'reload schema');

commit;
