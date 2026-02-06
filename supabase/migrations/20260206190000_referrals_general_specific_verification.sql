-- Path: supabase/migrations/20260206190000_referrals_general_specific_verification.sql
begin;

-- Ensure base table exists
do $$
begin
  if to_regclass('public.referrals') is null then
    raise exception 'public.referrals table is required for this migration';
  end if;
end $$;

-- 1) General vs Specific referral scope
do $$
begin
  create type public.referral_scope as enum ('general', 'specific');
exception
  when duplicate_object then null;
end $$;

-- 2) Verification code generator (used for PDF + public verification)
create or replace function public.generate_referral_verification_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  -- Low-collision, human-friendly token
  v_code := 'DCT-' || substr(encode(gen_random_bytes(16), 'hex'), 1, 16);
  return v_code;
end;
$$;

-- 3) Add columns (idempotent)
alter table public.referrals
  add column if not exists referral_scope public.referral_scope not null default 'specific',
  add column if not exists target_field text,
  add column if not exists target_details jsonb not null default '{}'::jsonb,
  add column if not exists verification_code text;

-- 4) Ensure verification_code default is set
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'referrals'
      and column_name = 'verification_code'
  ) then
    execute 'alter table public.referrals alter column verification_code set default public.generate_referral_verification_code()';
  end if;
end $$;

-- 5) Backfill verification_code for existing rows
update public.referrals
set verification_code = public.generate_referral_verification_code()
where verification_code is null;

-- 6) Make verification_code required (after backfill)
do $$
begin
  begin
    execute 'alter table public.referrals alter column verification_code set not null';
  exception
    when others then
      -- If something unexpected prevents NOT NULL, keep the column nullable rather than breaking deploy
      null;
  end;
end $$;

-- 7) Keep scope consistent for any legacy rows without a specific receiver
update public.referrals
set referral_scope = 'general'
where receiver_entity_id is null
  and referral_scope = 'specific';

-- 8) Consistency constraint (only require receiver_entity_id when scope is specific)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'referrals_scope_receiver_chk'
      and conrelid = 'public.referrals'::regclass
  ) then
    alter table public.referrals
      add constraint referrals_scope_receiver_chk
      check (receiver_entity_id is not null or referral_scope = 'general');
  end if;
end $$;

-- 9) Indexes
create unique index if not exists idx_referrals_verification_code
  on public.referrals (verification_code);

create index if not exists idx_referrals_scope_created
  on public.referrals (referral_scope, created_at desc);

create index if not exists idx_referrals_target_field
  on public.referrals (target_field);

commit;
