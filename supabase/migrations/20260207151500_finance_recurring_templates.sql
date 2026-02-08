-- File: supabase/migrations/20260207151500_finance_recurring_templates.sql
-- Step 31: Recurring fixed costs (utilities, rent, taxes, maintenance) -> finance entries
-- Idempotent migration

begin;

create table if not exists public.finance_recurring_templates (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null, -- 'clinic' | 'lab' | 'imaging' | 'pharmacy'
  entity_id uuid not null,

  -- what to post
  entry_type public.finance_entry_type not null default 'expense',
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD',

  category_id uuid null references public.finance_categories(id) on delete set null,

  description text null,
  metadata jsonb not null default '{}'::jsonb,

  -- schedule
  frequency text not null, -- 'daily' | 'weekly' | 'monthly'
  interval int not null default 1 check (interval >= 1),

  -- for weekly schedules
  byweekday int[] null, -- 0=Sun ... 6=Sat

  -- for monthly schedules: day of month 1..28/29/30/31 (we clamp)
  bymonthday int null check (bymonthday is null or (bymonthday >= 1 and bymonthday <= 31)),

  start_date date not null default (now()::date),
  end_date date null,

  -- state
  is_active boolean not null default true,
  last_run_at timestamptz null,
  next_run_at timestamptz null,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_recurring_templates_entity_idx
  on public.finance_recurring_templates(entity_type, entity_id);

create index if not exists finance_recurring_templates_next_run_idx
  on public.finance_recurring_templates(is_active, next_run_at);

alter table public.finance_recurring_templates enable row level security;

-- updated_at trigger
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

drop trigger if exists trg_finance_recurring_templates_updated_at on public.finance_recurring_templates;
create trigger trg_finance_recurring_templates_updated_at
before update on public.finance_recurring_templates
for each row execute function public.set_updated_at();

-- RLS policies
drop policy if exists "finance_recurring_templates_select" on public.finance_recurring_templates;
create policy "finance_recurring_templates_select"
on public.finance_recurring_templates
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_recurring_templates_insert" on public.finance_recurring_templates;
create policy "finance_recurring_templates_insert"
on public.finance_recurring_templates
for insert
to authenticated
with check (
  public.can_access_entity(entity_type, entity_id)
  and created_by = auth.uid()
);

drop policy if exists "finance_recurring_templates_update" on public.finance_recurring_templates;
create policy "finance_recurring_templates_update"
on public.finance_recurring_templates
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_recurring_templates_delete" on public.finance_recurring_templates;
create policy "finance_recurring_templates_delete"
on public.finance_recurring_templates
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

-- Helper: compute next run timestamp (simple scheduler)
create or replace function public.finance_compute_next_run_at(
  p_frequency text,
  p_interval int,
  p_byweekday int[],
  p_bymonthday int,
  p_anchor_date date
)
returns timestamptz
language plpgsql
as $$
declare
  v_freq text := lower(trim(coalesce(p_frequency, 'monthly')));
  v_interval int := greatest(coalesce(p_interval, 1), 1);
  v_anchor date := coalesce(p_anchor_date, now()::date);
  v_candidate date;
  v_dow int;
  v_target_dom int;
  v_last_day int;
begin
  if v_freq = 'daily' then
    return (v_anchor + (v_interval || ' days')::interval)::timestamptz;

  elsif v_freq = 'weekly' then
    -- find next matching weekday within interval weeks (default: same weekday as anchor)
    if p_byweekday is null or array_length(p_byweekday, 1) is null then
      v_candidate := v_anchor + (v_interval || ' weeks')::interval;
      return v_candidate::timestamptz;
    end if;

    -- Start searching from next day
    v_candidate := v_anchor + interval '1 day';
    loop
      v_dow := extract(dow from v_candidate)::int; -- 0..6
      if v_dow = any(p_byweekday) then
        return v_candidate::timestamptz;
      end if;
      v_candidate := v_candidate + interval '1 day';
      -- safety stop
      if v_candidate > (v_anchor + interval '370 days') then
        return (v_anchor + interval '7 days')::timestamptz;
      end if;
    end loop;

  else
    -- monthly (default)
    v_target_dom := coalesce(p_bymonthday, extract(day from v_anchor)::int);
    -- move to next month by interval
    v_candidate := (date_trunc('month', v_anchor)::date + (v_interval || ' months')::interval)::date;
    -- clamp day-of-month to last day
    v_last_day := extract(day from (date_trunc('month', v_candidate)::date + interval '1 month - 1 day'))::int;
    v_target_dom := greatest(1, least(v_target_dom, v_last_day));
    v_candidate := (date_trunc('month', v_candidate)::date + ((v_target_dom - 1) || ' days')::interval)::date;
    return v_candidate::timestamptz;
  end if;
end;
$$;

-- Backfill next_run_at for existing rows that don't have it
update public.finance_recurring_templates
set next_run_at = public.finance_compute_next_run_at(
  frequency, interval, byweekday, bymonthday, start_date
)
where next_run_at is null;

commit;
