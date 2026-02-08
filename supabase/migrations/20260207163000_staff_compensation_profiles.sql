-- File: supabase/migrations/20260207163000_staff_compensation_profiles.sql
-- Step 36: Staff compensation profiles (salary/hourly/commission) + payment frequency
-- Idempotent migration

begin;

-- 1) enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'staff_compensation_type') then
    create type public.staff_compensation_type as enum ('salary', 'hourly', 'commission');
  end if;

  if not exists (select 1 from pg_type where typname = 'staff_pay_frequency') then
    create type public.staff_pay_frequency as enum ('hourly', 'daily', 'weekly', 'monthly', 'per_event');
  end if;
end$$;

-- 2) staff compensation profiles
create table if not exists public.staff_compensation_profiles (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null, -- 'clinic' | 'lab' | 'imaging' | 'pharmacy'
  entity_id uuid not null,

  staff_user_id uuid not null references auth.users(id) on delete cascade,

  compensation_type public.staff_compensation_type not null default 'salary',
  pay_frequency public.staff_pay_frequency not null default 'monthly',

  currency text not null default 'USD',

  -- salary: fixed amount per pay frequency (monthly/weekly/daily)
  salary_amount_cents integer not null default 0 check (salary_amount_cents >= 0),

  -- hourly: cents per hour (pay_frequency can still be weekly/monthly for batching, but rate is hourly)
  hourly_rate_cents integer not null default 0 check (hourly_rate_cents >= 0),

  -- commission: percentage in basis points (e.g. 10% => 1000 bps)
  commission_bps integer not null default 0 check (commission_bps >= 0 and commission_bps <= 10000),

  -- commission: optional category filter for eligible income (null => all income)
  commission_category_id uuid null references public.finance_categories(id) on delete set null,

  -- commission: optional "only if paid" (defaults true to avoid paying on unpaid revenue)
  commission_requires_paid boolean not null default true,

  -- configuration window
  effective_from date not null default (now()::date),
  effective_to date null,

  is_active boolean not null default true,

  notes text null,
  metadata jsonb not null default '{}'::jsonb,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists staff_comp_profiles_unique_active
  on public.staff_compensation_profiles(entity_type, entity_id, staff_user_id)
  where is_active = true;

create index if not exists staff_comp_profiles_entity_idx
  on public.staff_compensation_profiles(entity_type, entity_id);

create index if not exists staff_comp_profiles_staff_idx
  on public.staff_compensation_profiles(staff_user_id);

alter table public.staff_compensation_profiles enable row level security;

-- 3) updated_at trigger helper (if not already present)
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at' and pronamespace = 'public'::regnamespace) then
    -- ok
  else
    create or replace function public.set_updated_at()
    returns trigger
    language plpgsql
    as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$;
  end if;
end$$;

drop trigger if exists trg_staff_comp_profiles_updated_at on public.staff_compensation_profiles;
create trigger trg_staff_comp_profiles_updated_at
before update on public.staff_compensation_profiles
for each row execute function public.set_updated_at();

-- 4) RLS policies
-- only admins/managers can manage; staff can view their own profile
drop policy if exists "staff_comp_profiles_select" on public.staff_compensation_profiles;
create policy "staff_comp_profiles_select"
on public.staff_compensation_profiles
for select
to authenticated
using (
  public.can_access_entity(entity_type, entity_id)
  or staff_user_id = auth.uid()
);

drop policy if exists "staff_comp_profiles_insert" on public.staff_compensation_profiles;
create policy "staff_comp_profiles_insert"
on public.staff_compensation_profiles
for insert
to authenticated
with check (
  public.can_access_entity(entity_type, entity_id)
  and created_by = auth.uid()
);

drop policy if exists "staff_comp_profiles_update" on public.staff_compensation_profiles;
create policy "staff_comp_profiles_update"
on public.staff_compensation_profiles
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "staff_comp_profiles_delete" on public.staff_compensation_profiles;
create policy "staff_comp_profiles_delete"
on public.staff_compensation_profiles
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

commit;
