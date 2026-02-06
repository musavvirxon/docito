-- File: supabase/migrations/20260206193000_treatment_plans_verification_archives.sql
-- Path: supabase/migrations/20260206193000_treatment_plans_verification_archives.sql
--
-- Purpose:
-- 1) Add a permanent verification_code to treatment_plans.
-- 2) Create immutable archive tables for treatment plans and referrals so
--    Super Admin can verify/view details even after the original row is deleted.
-- 3) Create BEFORE DELETE triggers that snapshot full record payloads.

begin;

-- Safety: required base tables
do $$
begin
  if to_regclass('public.treatment_plans') is null then
    raise exception 'public.treatment_plans table is required for this migration';
  end if;
  if to_regclass('public.referrals') is null then
    raise exception 'public.referrals table is required for this migration';
  end if;
end $$;

-- Needed for gen_random_bytes
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- A) treatment_plans.verification_code
-- ------------------------------------------------------------

create or replace function public.generate_treatment_plan_verification_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  -- Low-collision, human-friendly token
  v_code := 'DCT-TP-' || substr(encode(gen_random_bytes(16), 'hex'), 1, 16);
  return v_code;
end;
$$;

alter table public.treatment_plans
  add column if not exists verification_code text;

-- Ensure default is set (idempotent)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'treatment_plans'
      and column_name = 'verification_code'
  ) then
    execute 'alter table public.treatment_plans alter column verification_code set default public.generate_treatment_plan_verification_code()';
  end if;
end $$;

-- Backfill existing rows
update public.treatment_plans
set verification_code = public.generate_treatment_plan_verification_code()
where verification_code is null
   or btrim(verification_code) = '';

-- Make NOT NULL when possible (do not break deploy if unexpected legacy data)
do $$
begin
  begin
    execute 'alter table public.treatment_plans alter column verification_code set not null';
  exception when others then
    null;
  end;
end $$;

create unique index if not exists idx_treatment_plans_verification_code
  on public.treatment_plans (verification_code);

create or replace function public.trg_treatment_plans_set_verification_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_code is null or btrim(new.verification_code) = '' then
    new.verification_code := public.generate_treatment_plan_verification_code();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_treatment_plans_set_verification_code on public.treatment_plans;
create trigger trg_treatment_plans_set_verification_code
before insert on public.treatment_plans
for each row
execute function public.trg_treatment_plans_set_verification_code();

-- ------------------------------------------------------------
-- B) Immutable verification archives
-- ------------------------------------------------------------

create table if not exists public.treatment_plan_verification_archives (
  id uuid primary key default gen_random_uuid(),
  treatment_plan_id uuid not null,
  verification_code text not null,
  payload jsonb not null,
  deleted_by uuid,
  deleted_at timestamptz not null default now(),
  archived_at timestamptz not null default now()
);

create unique index if not exists idx_treatment_plan_verification_archives_code
  on public.treatment_plan_verification_archives (verification_code);

create index if not exists idx_treatment_plan_verification_archives_plan_id
  on public.treatment_plan_verification_archives (treatment_plan_id);

create table if not exists public.referral_verification_archives (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null,
  verification_code text not null,
  payload jsonb not null,
  deleted_by uuid,
  deleted_at timestamptz not null default now(),
  archived_at timestamptz not null default now()
);

create unique index if not exists idx_referral_verification_archives_code
  on public.referral_verification_archives (verification_code);

create index if not exists idx_referral_verification_archives_referral_id
  on public.referral_verification_archives (referral_id);

-- Lock down archives (service role bypasses RLS, but keep a strict policy for safety)
alter table public.treatment_plan_verification_archives enable row level security;
alter table public.referral_verification_archives enable row level security;

drop policy if exists "Superadmins can read treatment plan archives" on public.treatment_plan_verification_archives;
create policy "Superadmins can read treatment plan archives"
on public.treatment_plan_verification_archives
for select
using (public.is_super_admin());

drop policy if exists "Superadmins can read referral archives" on public.referral_verification_archives;
create policy "Superadmins can read referral archives"
on public.referral_verification_archives
for select
using (public.is_super_admin());

-- ------------------------------------------------------------
-- C) BEFORE DELETE snapshots
-- ------------------------------------------------------------

create or replace function public.trg_treatment_plans_archive_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_payload jsonb;
  v_procedures jsonb := '[]'::jsonb;
  v_medications jsonb := '[]'::jsonb;
  v_tp_medications jsonb := '[]'::jsonb;
  v_consent_forms jsonb := '[]'::jsonb;
  v_attachments jsonb := '[]'::jsonb;
begin
  v_code := nullif(btrim(coalesce(old.verification_code, '')), '');
  if v_code is null then
    v_code := public.generate_treatment_plan_verification_code();
  end if;

  -- treatment_plan_procedures (+ procedure catalog)
  if to_regclass('public.treatment_plan_procedures') is not null then
    begin
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'treatment_plan_procedure', to_jsonb(tpp),
            'procedure', to_jsonb(p)
          )
          order by tpp.created_at
        ),
        '[]'::jsonb
      )
      into v_procedures
      from public.treatment_plan_procedures tpp
      left join public.procedures p on p.id = tpp.procedure_id
      where tpp.treatment_plan_id = old.id;
    exception when others then
      v_procedures := '[]'::jsonb;
    end;
  end if;

  -- legacy medications table (public.medications)
  if to_regclass('public.medications') is not null then
    begin
      select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]'::jsonb)
      into v_medications
      from public.medications m
      where m.treatment_plan_id = old.id;
    exception when others then
      v_medications := '[]'::jsonb;
    end;
  end if;

  -- public.treatment_plan_medications (newer)
  if to_regclass('public.treatment_plan_medications') is not null then
    begin
      select coalesce(jsonb_agg(to_jsonb(tpm) order by tpm.created_at), '[]'::jsonb)
      into v_tp_medications
      from public.treatment_plan_medications tpm
      where tpm.treatment_plan_id = old.id;
    exception when others then
      v_tp_medications := '[]'::jsonb;
    end;
  end if;

  -- consent_forms
  if to_regclass('public.consent_forms') is not null then
    begin
      select coalesce(jsonb_agg(to_jsonb(cf) order by cf.created_at), '[]'::jsonb)
      into v_consent_forms
      from public.consent_forms cf
      where cf.treatment_plan_id = old.id;
    exception when others then
      v_consent_forms := '[]'::jsonb;
    end;
  end if;

  -- procedure_attachments
  if to_regclass('public.procedure_attachments') is not null then
    begin
      select coalesce(jsonb_agg(to_jsonb(pa) order by pa.created_at), '[]'::jsonb)
      into v_attachments
      from public.procedure_attachments pa
      where pa.treatment_plan_id = old.id;
    exception when others then
      v_attachments := '[]'::jsonb;
    end;
  end if;

  v_payload := jsonb_build_object(
    'treatment_plan', to_jsonb(old),
    'treatment_plan_id', old.id,
    'verification_code', v_code,
    'procedures', v_procedures,
    'medications', v_medications,
    'treatment_plan_medications', v_tp_medications,
    'consent_forms', v_consent_forms,
    'attachments', v_attachments
  );

  insert into public.treatment_plan_verification_archives (
    treatment_plan_id,
    verification_code,
    payload,
    deleted_by,
    deleted_at,
    archived_at
  )
  values (
    old.id,
    v_code,
    v_payload,
    auth.uid(),
    now(),
    now()
  )
  on conflict (verification_code) do update
  set
    treatment_plan_id = excluded.treatment_plan_id,
    payload = excluded.payload,
    deleted_by = excluded.deleted_by,
    deleted_at = excluded.deleted_at,
    archived_at = excluded.archived_at;

  return old;
end;
$$;

drop trigger if exists trg_treatment_plans_archive_on_delete on public.treatment_plans;
create trigger trg_treatment_plans_archive_on_delete
before delete on public.treatment_plans
for each row
execute function public.trg_treatment_plans_archive_on_delete();

create or replace function public.trg_referrals_archive_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_payload jsonb;
  v_appointments jsonb := '[]'::jsonb;
  v_slots jsonb := '[]'::jsonb;
  v_notifications jsonb := '[]'::jsonb;
begin
  v_code := nullif(btrim(coalesce(old.verification_code, '')), '');

  if v_code is null then
    if to_regprocedure('public.generate_referral_verification_code()') is not null then
      v_code := public.generate_referral_verification_code();
    else
      v_code := 'DCT-RF-' || substr(encode(gen_random_bytes(16), 'hex'), 1, 16);
    end if;
  end if;

  if to_regclass('public.referral_appointments') is not null then
    begin
      select coalesce(jsonb_agg(to_jsonb(ra) order by ra.appointment_date, ra.start_time), '[]'::jsonb)
      into v_appointments
      from public.referral_appointments ra
      where ra.referral_id = old.id;
    exception when others then
      v_appointments := '[]'::jsonb;
    end;
  end if;

  if to_regclass('public.referral_slots') is not null then
    begin
      select coalesce(jsonb_agg(to_jsonb(rs) order by rs.slot_date, rs.start_time), '[]'::jsonb)
      into v_slots
      from public.referral_slots rs
      where rs.referral_id = old.id;
    exception when others then
      v_slots := '[]'::jsonb;
    end;
  end if;

  if to_regclass('public.referral_notifications') is not null then
    begin
      select coalesce(jsonb_agg(to_jsonb(rn) order by rn.created_at), '[]'::jsonb)
      into v_notifications
      from public.referral_notifications rn
      where rn.referral_id = old.id;
    exception when others then
      v_notifications := '[]'::jsonb;
    end;
  end if;

  v_payload := jsonb_build_object(
    'referral', to_jsonb(old),
    'referral_id', old.id,
    'verification_code', v_code,
    'referral_appointments', v_appointments,
    'referral_slots', v_slots,
    'referral_notifications', v_notifications
  );

  insert into public.referral_verification_archives (
    referral_id,
    verification_code,
    payload,
    deleted_by,
    deleted_at,
    archived_at
  )
  values (
    old.id,
    v_code,
    v_payload,
    auth.uid(),
    now(),
    now()
  )
  on conflict (verification_code) do update
  set
    referral_id = excluded.referral_id,
    payload = excluded.payload,
    deleted_by = excluded.deleted_by,
    deleted_at = excluded.deleted_at,
    archived_at = excluded.archived_at;

  return old;
end;
$$;

drop trigger if exists trg_referrals_archive_on_delete on public.referrals;
create trigger trg_referrals_archive_on_delete
before delete on public.referrals
for each row
execute function public.trg_referrals_archive_on_delete();

commit;
