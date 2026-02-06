-- File: supabase/migrations/20260207090000_docito_verification_archives.sql

-- 1) Extensions (idempotent)
create extension if not exists pgcrypto;

-- 2) Archive table (idempotent)
create table if not exists public.docito_document_archives (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  verification_code text not null,
  snapshot jsonb not null,
  deleted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists docito_document_archives_entity_idx
  on public.docito_document_archives (entity_type, entity_id);

create unique index if not exists docito_document_archives_verification_code_uq
  on public.docito_document_archives (verification_code);

alter table public.docito_document_archives enable row level security;

-- 3) Verification code generator (idempotent)
create or replace function public.docito_make_verification_code(prefix text)
returns text
language plpgsql
as $$
declare
  p text := upper(coalesce(nullif(trim(prefix), ''), 'XX'));
  s text := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12));
begin
  return p || '-' || s;
end;
$$;

-- 4) Ensure verification_code columns exist + unique indexes + backfill (idempotent)
do $$
begin
  -- treatment_plans
  if to_regclass('public.treatment_plans') is not null then
    execute 'alter table public.treatment_plans add column if not exists verification_code text';
    execute 'create unique index if not exists treatment_plans_verification_code_uq on public.treatment_plans (verification_code)';
    execute $$update public.treatment_plans
            set verification_code = public.docito_make_verification_code('TP')
            where verification_code is null or btrim(verification_code) = ''$$;
  end if;

  -- referrals
  if to_regclass('public.referrals') is not null then
    execute 'alter table public.referrals add column if not exists verification_code text';
    execute 'create unique index if not exists referrals_verification_code_uq on public.referrals (verification_code)';
    execute $$update public.referrals
            set verification_code = public.docito_make_verification_code('RF')
            where verification_code is null or btrim(verification_code) = ''$$;
  end if;
end $$;

-- 5) Snapshot builders (idempotent)
create or replace function public.docito_snapshot_treatment_plan(plan_id uuid)
returns jsonb
language plpgsql
as $$
declare
  plan_row jsonb;
  procs jsonb := '[]'::jsonb;
  meds  jsonb := '[]'::jsonb;
  cons  jsonb := '[]'::jsonb;
  attach_a jsonb := '[]'::jsonb;
  attach_b jsonb := '[]'::jsonb;
begin
  if to_regclass('public.treatment_plans') is null then
    return null;
  end if;

  select to_jsonb(tp) into plan_row
  from public.treatment_plans tp
  where tp.id = plan_id;

  if plan_row is null then
    return null;
  end if;

  if to_regclass('public.treatment_plan_procedures') is not null then
    begin
      select coalesce(jsonb_agg(to_jsonb(tpp) order by tpp.sequence_order nulls last, tpp.created_at), '[]'::jsonb)
        into procs
      from public.treatment_plan_procedures tpp
      where tpp.treatment_plan_id = plan_id;
    exception when others then
      procs := '[]'::jsonb;
    end;
  end if;

  if to_regclass('public.medications') is not null then
    begin
      select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]'::jsonb)
        into meds
      from public.medications m
      where m.treatment_plan_id = plan_id;
    exception when others then
      meds := '[]'::jsonb;
    end;
  end if;

  if to_regclass('public.consent_forms') is not null then
    begin
      select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]'::jsonb)
        into cons
      from public.consent_forms c
      where c.treatment_plan_id = plan_id;
    exception when others then
      cons := '[]'::jsonb;
    end;
  end if;

  if to_regclass('public.procedure_attachments') is not null then
    begin
      -- preferred: attachments tied to treatment_plan_id
      select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at), '[]'::jsonb)
        into attach_a
      from public.procedure_attachments a
      where (a.treatment_plan_id = plan_id);
    exception when others then
      attach_a := '[]'::jsonb;
    end;
  end if;

  if to_regclass('public.procedure_files') is not null and to_regclass('public.treatment_plan_procedures') is not null then
    begin
      -- fallback: files tied to procedure_id list
      select coalesce(jsonb_agg(to_jsonb(pf) order by pf.created_at), '[]'::jsonb)
        into attach_b
      from public.procedure_files pf
      where pf.procedure_id in (
        select tpp.procedure_id
        from public.treatment_plan_procedures tpp
        where tpp.treatment_plan_id = plan_id
      );
    exception when others then
      attach_b := '[]'::jsonb;
    end;
  end if;

  return jsonb_build_object(
    'treatment_plan', plan_row,
    'procedures', procs,
    'medications', meds,
    'consent_forms', cons,
    'procedure_attachments', attach_a,
    'procedure_files', attach_b
  );
end;
$$;

create or replace function public.docito_snapshot_referral(ref_id uuid)
returns jsonb
language plpgsql
as $$
declare
  ref_row jsonb;
begin
  if to_regclass('public.referrals') is null then
    return null;
  end if;

  select to_jsonb(r) into ref_row
  from public.referrals r
  where r.id = ref_id;

  if ref_row is null then
    return null;
  end if;

  return jsonb_build_object('referral', ref_row);
end;
$$;

-- 6) Triggers: set verification_code on insert (idempotent)
create or replace function public.docito_set_verification_code_treatment_plans()
returns trigger
language plpgsql
as $$
begin
  if new.verification_code is null or btrim(new.verification_code) = '' then
    new.verification_code := public.docito_make_verification_code('TP');
  end if;
  return new;
end;
$$;

create or replace function public.docito_set_verification_code_referrals()
returns trigger
language plpgsql
as $$
begin
  if new.verification_code is null or btrim(new.verification_code) = '' then
    new.verification_code := public.docito_make_verification_code('RF');
  end if;
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.treatment_plans') is not null then
    execute 'drop trigger if exists trg_treatment_plans_set_verification_code on public.treatment_plans';
    execute 'create trigger trg_treatment_plans_set_verification_code
             before insert on public.treatment_plans
             for each row execute function public.docito_set_verification_code_treatment_plans()';
  end if;

  if to_regclass('public.referrals') is not null then
    execute 'drop trigger if exists trg_referrals_set_verification_code on public.referrals';
    execute 'create trigger trg_referrals_set_verification_code
             before insert on public.referrals
             for each row execute function public.docito_set_verification_code_referrals()';
  end if;
end $$;

-- 7) Triggers: archive snapshot on delete (idempotent)
create or replace function public.docito_archive_treatment_plan_before_delete()
returns trigger
language plpgsql
as $$
declare
  vcode text;
  snap jsonb;
begin
  vcode := coalesce(nullif(btrim(old.verification_code), ''), public.docito_make_verification_code('TP'));
  snap := public.docito_snapshot_treatment_plan(old.id);

  insert into public.docito_document_archives (entity_type, entity_id, verification_code, snapshot, deleted_at)
  values ('treatment_plan', old.id, vcode, coalesce(snap, jsonb_build_object('treatment_plan', to_jsonb(old))), now())
  on conflict (verification_code) do update
    set entity_type = excluded.entity_type,
        entity_id = excluded.entity_id,
        snapshot = excluded.snapshot,
        deleted_at = excluded.deleted_at;

  return old;
end;
$$;

create or replace function public.docito_archive_referral_before_delete()
returns trigger
language plpgsql
as $$
declare
  vcode text;
  snap jsonb;
begin
  vcode := coalesce(nullif(btrim(old.verification_code), ''), public.docito_make_verification_code('RF'));
  snap := public.docito_snapshot_referral(old.id);

  insert into public.docito_document_archives (entity_type, entity_id, verification_code, snapshot, deleted_at)
  values ('referral', old.id, vcode, coalesce(snap, jsonb_build_object('referral', to_jsonb(old))), now())
  on conflict (verification_code) do update
    set entity_type = excluded.entity_type,
        entity_id = excluded.entity_id,
        snapshot = excluded.snapshot,
        deleted_at = excluded.deleted_at;

  return old;
end;
$$;

do $$
begin
  if to_regclass('public.treatment_plans') is not null then
    execute 'drop trigger if exists trg_treatment_plans_archive_before_delete on public.treatment_plans';
    execute 'create trigger trg_treatment_plans_archive_before_delete
             before delete on public.treatment_plans
             for each row execute function public.docito_archive_treatment_plan_before_delete()';
  end if;

  if to_regclass('public.referrals') is not null then
    execute 'drop trigger if exists trg_referrals_archive_before_delete on public.referrals';
    execute 'create trigger trg_referrals_archive_before_delete
             before delete on public.referrals
             for each row execute function public.docito_archive_referral_before_delete()';
  end if;
end $$;
