-- File: supabase/migrations/20260207153000_finance_payroll_runs.sql
-- Step 32: Payroll runs -> mark paid -> create finance ledger entry (payroll)
-- Idempotent migration

begin;

-- 1) Payroll run status enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'finance_payroll_run_status') then
    create type public.finance_payroll_run_status as enum ('draft', 'approved', 'paid', 'void');
  end if;
end$$;

-- 2) Payroll runs (header)
create table if not exists public.finance_payroll_runs (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null, -- 'clinic' | 'lab' | 'imaging' | 'pharmacy'
  entity_id uuid not null,

  period_start date not null,
  period_end date not null,

  payout_date date not null default (now()::date),

  currency text not null default 'USD',

  status public.finance_payroll_run_status not null default 'draft',

  notes text null,
  metadata jsonb not null default '{}'::jsonb,

  -- totals (majority of orgs treat gross as the expense; net tracked in metadata)
  total_gross_cents integer not null default 0 check (total_gross_cents >= 0),
  total_net_cents integer not null default 0 check (total_net_cents >= 0),
  total_deductions_cents integer not null default 0 check (total_deductions_cents >= 0),

  -- linkage to finance ledger
  finance_entry_id uuid null references public.finance_entries(id) on delete set null,

  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  paid_by uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  approved_at timestamptz null,
  paid_at timestamptz null,
  updated_at timestamptz not null default now()
);

create index if not exists finance_payroll_runs_entity_idx
  on public.finance_payroll_runs(entity_type, entity_id);

create index if not exists finance_payroll_runs_status_idx
  on public.finance_payroll_runs(entity_type, entity_id, status, payout_date);

-- 3) Payroll items (detail)
create table if not exists public.finance_payroll_items (
  id uuid primary key default gen_random_uuid(),

  payroll_run_id uuid not null references public.finance_payroll_runs(id) on delete cascade,

  entity_type text not null,
  entity_id uuid not null,

  staff_user_id uuid null references auth.users(id) on delete set null,
  staff_display_name text null,

  compensation_type text not null default 'salary', -- 'salary' | 'hourly' | 'commission'
  hours_worked numeric(10,2) not null default 0 check (hours_worked >= 0),

  rate_cents integer not null default 0 check (rate_cents >= 0), -- hourly rate or base salary/commission basis
  gross_cents integer not null default 0 check (gross_cents >= 0),
  deductions_cents integer not null default 0 check (deductions_cents >= 0),
  net_cents integer not null default 0 check (net_cents >= 0),

  description text null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_payroll_items_run_idx
  on public.finance_payroll_items(payroll_run_id);

create index if not exists finance_payroll_items_entity_idx
  on public.finance_payroll_items(entity_type, entity_id);

-- 4) updated_at trigger helper (if not already present)
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

drop trigger if exists trg_finance_payroll_runs_updated_at on public.finance_payroll_runs;
create trigger trg_finance_payroll_runs_updated_at
before update on public.finance_payroll_runs
for each row execute function public.set_updated_at();

drop trigger if exists trg_finance_payroll_items_updated_at on public.finance_payroll_items;
create trigger trg_finance_payroll_items_updated_at
before update on public.finance_payroll_items
for each row execute function public.set_updated_at();

-- 5) RLS
alter table public.finance_payroll_runs enable row level security;
alter table public.finance_payroll_items enable row level security;

-- Runs
drop policy if exists "finance_payroll_runs_select" on public.finance_payroll_runs;
create policy "finance_payroll_runs_select"
on public.finance_payroll_runs
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_payroll_runs_insert" on public.finance_payroll_runs;
create policy "finance_payroll_runs_insert"
on public.finance_payroll_runs
for insert
to authenticated
with check (
  public.can_access_entity(entity_type, entity_id)
  and created_by = auth.uid()
);

drop policy if exists "finance_payroll_runs_update" on public.finance_payroll_runs;
create policy "finance_payroll_runs_update"
on public.finance_payroll_runs
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_payroll_runs_delete" on public.finance_payroll_runs;
create policy "finance_payroll_runs_delete"
on public.finance_payroll_runs
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

-- Items
drop policy if exists "finance_payroll_items_select" on public.finance_payroll_items;
create policy "finance_payroll_items_select"
on public.finance_payroll_items
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_payroll_items_insert" on public.finance_payroll_items;
create policy "finance_payroll_items_insert"
on public.finance_payroll_items
for insert
to authenticated
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_payroll_items_update" on public.finance_payroll_items;
create policy "finance_payroll_items_update"
on public.finance_payroll_items
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_payroll_items_delete" on public.finance_payroll_items;
create policy "finance_payroll_items_delete"
on public.finance_payroll_items
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

-- 6) Helper RPC: recompute run totals from items
create or replace function public.finance_payroll_recompute_totals(p_run_id uuid)
returns table (
  total_gross_cents integer,
  total_net_cents integer,
  total_deductions_cents integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.finance_payroll_runs;
  v_gross integer;
  v_net integer;
  v_ded integer;
begin
  select * into v_run
  from public.finance_payroll_runs
  where id = p_run_id;

  if v_run.id is null then
    raise exception 'Payroll run not found';
  end if;

  if not public.can_access_entity(v_run.entity_type, v_run.entity_id) then
    raise exception 'Forbidden';
  end if;

  select
    coalesce(sum(gross_cents), 0)::int,
    coalesce(sum(net_cents), 0)::int,
    coalesce(sum(deductions_cents), 0)::int
  into v_gross, v_net, v_ded
  from public.finance_payroll_items
  where payroll_run_id = p_run_id;

  update public.finance_payroll_runs
  set total_gross_cents = v_gross,
      total_net_cents = v_net,
      total_deductions_cents = v_ded
  where id = p_run_id;

  total_gross_cents := v_gross;
  total_net_cents := v_net;
  total_deductions_cents := v_ded;
  return next;
end;
$$;

revoke all on function public.finance_payroll_recompute_totals(uuid) from public;
grant execute on function public.finance_payroll_recompute_totals(uuid) to authenticated;

commit;
