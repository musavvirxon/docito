-- File: supabase/migrations/20260207130000_payroll_runs.sql

/*
  Step 10: Payroll runs + items (hourly + salary) and posting to finance ledger
  - New migration (unique timestamp)
  - Idempotent SQL
  - RLS enabled + policies using public.has_entity_access(entity_type, entity_id)
*/

create extension if not exists pgcrypto;

-- -----------------------------
-- payroll_runs
-- -----------------------------
create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null, -- 'practice' | 'lab' | 'pharmacy' | 'imaging_center'
  entity_id uuid not null,

  period_start date not null,
  period_end_exclusive date not null,

  status text not null default 'draft', -- 'draft' | 'posted' | 'paid' | 'void'
  currency text not null default 'USD',

  total_cents bigint not null default 0,

  notes text,

  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payroll_runs_entity_type_chk'
  ) then
    alter table public.payroll_runs
      add constraint payroll_runs_entity_type_chk
      check (entity_type in ('practice','lab','pharmacy','imaging_center'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'payroll_runs_status_chk'
  ) then
    alter table public.payroll_runs
      add constraint payroll_runs_status_chk
      check (status in ('draft','posted','paid','void'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'payroll_runs_period_chk'
  ) then
    alter table public.payroll_runs
      add constraint payroll_runs_period_chk
      check (period_end_exclusive > period_start);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'payroll_runs_total_nonneg_chk'
  ) then
    alter table public.payroll_runs
      add constraint payroll_runs_total_nonneg_chk
      check (total_cents >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'payroll_runs_unique_period'
  ) then
    alter table public.payroll_runs
      add constraint payroll_runs_unique_period
      unique (entity_type, entity_id, period_start, period_end_exclusive);
  end if;
end $$;

create index if not exists payroll_runs_entity_period_idx
  on public.payroll_runs (entity_type, entity_id, period_start desc);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'tg_payroll_runs_updated'
  ) then
    create trigger tg_payroll_runs_updated
    before update on public.payroll_runs
    for each row
    execute function public.tg_set_updated_columns();
  end if;
end $$;

alter table public.payroll_runs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='payroll_runs' and policyname='payroll_runs_select'
  ) then
    create policy payroll_runs_select
      on public.payroll_runs
      for select
      to authenticated
      using (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='payroll_runs' and policyname='payroll_runs_insert'
  ) then
    create policy payroll_runs_insert
      on public.payroll_runs
      for insert
      to authenticated
      with check (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
        and (created_by is null or created_by = auth.uid())
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='payroll_runs' and policyname='payroll_runs_update'
  ) then
    create policy payroll_runs_update
      on public.payroll_runs
      for update
      to authenticated
      using (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
      )
      with check (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='payroll_runs' and policyname='payroll_runs_delete'
  ) then
    create policy payroll_runs_delete
      on public.payroll_runs
      for delete
      to authenticated
      using (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
      );
  end if;
end $$;

-- -----------------------------
-- payroll_run_items
-- -----------------------------
create table if not exists public.payroll_run_items (
  id uuid primary key default gen_random_uuid(),

  run_id uuid not null references public.payroll_runs(id) on delete cascade,

  entity_type text not null,
  entity_id uuid not null,

  user_id uuid not null,

  compensation_profile_id uuid references public.staff_compensation_profiles(id) on delete set null,

  minutes_worked integer, -- for hourly
  units numeric,          -- optional (hours or shifts)
  amount_cents bigint not null,
  currency text not null default 'USD',

  details jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payroll_run_items_entity_type_chk'
  ) then
    alter table public.payroll_run_items
      add constraint payroll_run_items_entity_type_chk
      check (entity_type in ('practice','lab','pharmacy','imaging_center'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'payroll_run_items_amount_nonneg_chk'
  ) then
    alter table public.payroll_run_items
      add constraint payroll_run_items_amount_nonneg_chk
      check (amount_cents >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'payroll_run_items_minutes_nonneg_chk'
  ) then
    alter table public.payroll_run_items
      add constraint payroll_run_items_minutes_nonneg_chk
      check (minutes_worked is null or minutes_worked >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'payroll_run_items_one_per_user'
  ) then
    alter table public.payroll_run_items
      add constraint payroll_run_items_one_per_user
      unique (run_id, user_id);
  end if;
end $$;

create index if not exists payroll_run_items_run_idx
  on public.payroll_run_items (run_id);

create index if not exists payroll_run_items_entity_idx
  on public.payroll_run_items (entity_type, entity_id);

create index if not exists payroll_run_items_user_idx
  on public.payroll_run_items (user_id);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'tg_payroll_run_items_updated'
  ) then
    create trigger tg_payroll_run_items_updated
    before update on public.payroll_run_items
    for each row
    execute function public.tg_set_updated_columns();
  end if;
end $$;

alter table public.payroll_run_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='payroll_run_items' and policyname='payroll_run_items_select'
  ) then
    create policy payroll_run_items_select
      on public.payroll_run_items
      for select
      to authenticated
      using (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='payroll_run_items' and policyname='payroll_run_items_insert'
  ) then
    create policy payroll_run_items_insert
      on public.payroll_run_items
      for insert
      to authenticated
      with check (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
        and (created_by is null or created_by = auth.uid())
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='payroll_run_items' and policyname='payroll_run_items_update'
  ) then
    create policy payroll_run_items_update
      on public.payroll_run_items
      for update
      to authenticated
      using (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
      )
      with check (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='payroll_run_items' and policyname='payroll_run_items_delete'
  ) then
    create policy payroll_run_items_delete
      on public.payroll_run_items
      for delete
      to authenticated
      using (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
      );
  end if;
end $$;
