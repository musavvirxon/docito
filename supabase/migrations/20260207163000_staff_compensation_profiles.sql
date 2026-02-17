-- File: supabase/migrations/20260207163000_staff_compensation_profiles.sql
-- Canonical staff compensation profiles schema (upgrade-safe).
-- This migration is written to work whether the table was created earlier as a minimal bootstrap or from an older schema.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'staff_compensation_type') then
    create type public.staff_compensation_type as enum ('salary', 'hourly', 'commission');
  end if;

  if not exists (select 1 from pg_type where typname = 'staff_pay_frequency') then
    create type public.staff_pay_frequency as enum ('monthly', 'biweekly', 'weekly', 'daily');
  end if;
end $$;

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Create table if missing (full schema)
create table if not exists public.staff_compensation_profiles (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null,
  entity_id uuid not null,

  staff_user_id uuid not null references auth.users(id) on delete cascade,

  compensation_type public.staff_compensation_type not null default 'salary',
  pay_frequency public.staff_pay_frequency not null default 'monthly',

  currency text not null default 'USD',

  salary_amount_cents bigint not null default 0,
  hourly_rate_cents bigint not null default 0,

  commission_bps integer not null default 0,
  commission_category_id uuid null references public.finance_categories(id) on delete set null,
  commission_requires_paid boolean not null default true,

  effective_from date not null default current_date,
  effective_to date null,

  is_active boolean not null default true,

  notes text null,
  metadata jsonb not null default '{}'::jsonb,

  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade/normalize if the table already existed with a different schema
do $$
declare
  v_has_user_id boolean;
  v_has_staff_user_id boolean;
begin
  select exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff_compensation_profiles' and column_name = 'user_id'
  ) into v_has_user_id;

  select exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff_compensation_profiles' and column_name = 'staff_user_id'
  ) into v_has_staff_user_id;

  -- Rename user_id -> staff_user_id if needed
  if v_has_user_id and not v_has_staff_user_id then
    execute 'alter table public.staff_compensation_profiles rename column user_id to staff_user_id';
    v_has_staff_user_id := true;
  end if;

  -- Ensure core columns exist
  execute 'alter table public.staff_compensation_profiles add column if not exists entity_type text';
  execute 'alter table public.staff_compensation_profiles add column if not exists entity_id uuid';

  execute 'alter table public.staff_compensation_profiles add column if not exists staff_user_id uuid';

  -- Backfill staff_user_id from the old user_id column if it still exists (older schema)
  if v_has_user_id then
    execute 'update public.staff_compensation_profiles set staff_user_id = coalesce(staff_user_id, user_id) where staff_user_id is null and user_id is not null';
  end if;

  -- Add/upgrade fields used by the app
  execute 'alter table public.staff_compensation_profiles add column if not exists compensation_type public.staff_compensation_type';
  execute 'alter table public.staff_compensation_profiles alter column compensation_type set default ''salary''';

  execute 'alter table public.staff_compensation_profiles add column if not exists pay_frequency public.staff_pay_frequency';
  execute 'alter table public.staff_compensation_profiles alter column pay_frequency set default ''monthly''';

  execute 'alter table public.staff_compensation_profiles add column if not exists currency text';
  execute 'alter table public.staff_compensation_profiles alter column currency set default ''USD''';

  execute 'alter table public.staff_compensation_profiles add column if not exists salary_amount_cents bigint';
  execute 'alter table public.staff_compensation_profiles alter column salary_amount_cents set default 0';

  execute 'alter table public.staff_compensation_profiles add column if not exists hourly_rate_cents bigint';
  execute 'alter table public.staff_compensation_profiles alter column hourly_rate_cents set default 0';

  execute 'alter table public.staff_compensation_profiles add column if not exists commission_bps integer';
  execute 'alter table public.staff_compensation_profiles alter column commission_bps set default 0';

  execute 'alter table public.staff_compensation_profiles add column if not exists commission_category_id uuid';
  execute 'alter table public.staff_compensation_profiles add column if not exists commission_requires_paid boolean';
  execute 'alter table public.staff_compensation_profiles alter column commission_requires_paid set default true';

  execute 'alter table public.staff_compensation_profiles add column if not exists effective_from date';
  execute 'alter table public.staff_compensation_profiles alter column effective_from set default current_date';

  execute 'alter table public.staff_compensation_profiles add column if not exists effective_to date';

  execute 'alter table public.staff_compensation_profiles add column if not exists is_active boolean';
  execute 'alter table public.staff_compensation_profiles alter column is_active set default true';

  execute 'alter table public.staff_compensation_profiles add column if not exists notes text';

  execute 'alter table public.staff_compensation_profiles add column if not exists metadata jsonb';
  execute 'alter table public.staff_compensation_profiles alter column metadata set default ''{}''::jsonb';

  execute 'alter table public.staff_compensation_profiles add column if not exists created_by uuid';
  execute 'alter table public.staff_compensation_profiles add column if not exists created_at timestamptz';
  execute 'alter table public.staff_compensation_profiles alter column created_at set default now()';

  execute 'alter table public.staff_compensation_profiles add column if not exists updated_at timestamptz';
  execute 'alter table public.staff_compensation_profiles alter column updated_at set default now()';

  -- Ensure staff_user_id has an FK to auth.users (best-effort)
  if not exists (
    select 1
    from pg_constraint
    where conname = 'staff_compensation_profiles_staff_user_id_fkey'
      and conrelid = 'public.staff_compensation_profiles'::regclass
  ) then
    begin
      execute 'alter table public.staff_compensation_profiles add constraint staff_compensation_profiles_staff_user_id_fkey foreign key (staff_user_id) references auth.users(id) on delete cascade';
    exception when others then
      -- ignore if an equivalent FK already exists under a different name
      null;
    end;
  end if;

  -- Ensure commission_category_id has an FK to finance_categories (best-effort)
  if not exists (
    select 1
    from pg_constraint
    where conname = 'staff_compensation_profiles_commission_category_id_fkey'
      and conrelid = 'public.staff_compensation_profiles'::regclass
  ) then
    begin
      execute 'alter table public.staff_compensation_profiles add constraint staff_compensation_profiles_commission_category_id_fkey foreign key (commission_category_id) references public.finance_categories(id) on delete set null';
    exception when others then
      null;
    end;
  end if;

  -- Make key columns NOT NULL when possible (safe for existing data)
  begin
    execute 'alter table public.staff_compensation_profiles alter column entity_type set not null';
  exception when others then null; end;

  begin
    execute 'alter table public.staff_compensation_profiles alter column entity_id set not null';
  exception when others then null; end;

  if exists (select 1 from public.staff_compensation_profiles where staff_user_id is null) then
    -- leave nullable; app writes should always set it
    null;
  else
    begin
      execute 'alter table public.staff_compensation_profiles alter column staff_user_id set not null';
    exception when others then null; end;
  end if;

  begin
    execute 'alter table public.staff_compensation_profiles alter column compensation_type set not null';
  exception when others then null; end;

  begin
    execute 'alter table public.staff_compensation_profiles alter column pay_frequency set not null';
  exception when others then null; end;

end $$;

-- Indexes
create index if not exists staff_compensation_profiles_entity_idx
  on public.staff_compensation_profiles (entity_type, entity_id);

create index if not exists staff_compensation_profiles_staff_idx
  on public.staff_compensation_profiles (staff_user_id);

create unique index if not exists staff_compensation_profiles_unique_active
  on public.staff_compensation_profiles (entity_type, entity_id, staff_user_id, compensation_type)
  where is_active = true;

-- Trigger
drop trigger if exists set_updated_at_staff_compensation_profiles on public.staff_compensation_profiles;
create trigger set_updated_at_staff_compensation_profiles
before update on public.staff_compensation_profiles
for each row execute function public.set_updated_at();

-- RLS
alter table public.staff_compensation_profiles enable row level security;

drop policy if exists "Staff can manage compensation profiles for entities they can access" on public.staff_compensation_profiles;
create policy "Staff can manage compensation profiles for entities they can access"
  on public.staff_compensation_profiles
  for all
  to authenticated
  using (public.can_access_entity(entity_type, entity_id))
  with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "Staff can view their own compensation profile" on public.staff_compensation_profiles;
create policy "Staff can view their own compensation profile"
  on public.staff_compensation_profiles
  for select
  to authenticated
  using (staff_user_id = auth.uid());

commit;
