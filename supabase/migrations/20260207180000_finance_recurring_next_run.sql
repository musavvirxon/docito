-- File: supabase/migrations/20260207180000_finance_recurring_next_run.sql
-- B6: Recurring expense engine schema improvements + server-side next_run_at computation
-- - Adds month_of_year for yearly schedules
-- - Adds schedule validation constraints
-- - Adds functions:
--    public.finance_recurring_compute_next_run(...)
--    public.finance_recurring_set_next_run() trigger
-- - Ensures next_run_at is auto-maintained on insert/update
-- Idempotent migration

begin;

-- 1) Add month_of_year for yearly schedules
alter table public.finance_recurring_expenses
  add column if not exists month_of_year smallint null
    check (month_of_year is null or (month_of_year >= 1 and month_of_year <= 12));

-- 2) Add/ensure schedule validation constraints (frequency-specific required fields)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'finance_recurring_expenses_schedule_valid'
      and conrelid = 'public.finance_recurring_expenses'::regclass
  ) then
    alter table public.finance_recurring_expenses
      add constraint finance_recurring_expenses_schedule_valid check (
        (frequency = 'daily'::public.finance_recurring_frequency)
        or (frequency = 'weekly'::public.finance_recurring_frequency and weekday is not null)
        or (frequency = 'monthly'::public.finance_recurring_frequency and day_of_month is not null)
        or (frequency = 'yearly'::public.finance_recurring_frequency and month_of_year is not null and day_of_month is not null)
      );
  end if;
end$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'finance_recurring_expenses_amount_positive_if_active'
      and conrelid = 'public.finance_recurring_expenses'::regclass
  ) then
    alter table public.finance_recurring_expenses
      add constraint finance_recurring_expenses_amount_positive_if_active check (
        (is_active = false) or (amount_cents >= 0)
      );
  end if;
end$$;

-- 3) Compute next run timestamp (UTC aligned to 00:00:00 for weekly/monthly/yearly)
--    - daily: next day (same time-of-day as from_ts)
--    - weekly: next occurrence of weekday at 00:00 UTC (if today and time passed, move forward)
--    - monthly: next occurrence of day_of_month at 00:00 UTC (clamp to month end)
--    - yearly: next occurrence of month_of_year + day_of_month at 00:00 UTC (clamp day to month end)
create or replace function public.finance_recurring_compute_next_run(
  p_frequency public.finance_recurring_frequency,
  p_weekday smallint,
  p_day_of_month smallint,
  p_month_of_year smallint,
  p_from_ts timestamptz default now()
)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
declare
  v_from timestamptz := coalesce(p_from_ts, now());
  v_date date := (v_from at time zone 'utc')::date;
  v_time time := (v_from at time zone 'utc')::time;
  v_candidate timestamptz;
  v_target_date date;
  v_curr_year int := extract(year from (v_from at time zone 'utc'))::int;
  v_curr_month int := extract(month from (v_from at time zone 'utc'))::int;
  v_days_in_month int;
  v_day int;
  v_month int;
  v_year int;
  v_curr_dow int := extract(dow from (v_from at time zone 'utc'))::int; -- 0..6, 0=Sun
  v_delta int;
begin
  if p_frequency = 'daily'::public.finance_recurring_frequency then
    -- next day at same time-of-day (UTC)
    v_candidate := ((v_date + 1)::timestamptz at time zone 'utc') + v_time;
    return v_candidate;
  end if;

  if p_frequency = 'weekly'::public.finance_recurring_frequency then
    if p_weekday is null then
      raise exception 'weekday is required for weekly frequency';
    end if;

    v_delta := (p_weekday - v_curr_dow);
    if v_delta < 0 then
      v_delta := v_delta + 7;
    end if;

    v_target_date := v_date + v_delta;

    -- If the target is "today" but the time has already passed (we align to 00:00), push one week.
    v_candidate := (v_target_date::timestamptz at time zone 'utc'); -- 00:00 UTC
    if v_candidate <= v_from then
      v_candidate := ((v_target_date + 7)::timestamptz at time zone 'utc');
    end if;

    return v_candidate;
  end if;

  if p_frequency = 'monthly'::public.finance_recurring_frequency then
    if p_day_of_month is null then
      raise exception 'day_of_month is required for monthly frequency';
    end if;

    -- compute candidate in current month
    v_year := v_curr_year;
    v_month := v_curr_month;

    v_days_in_month := extract(day from (date_trunc('month', make_date(v_year, v_month, 1)) + interval '1 month - 1 day'))::int;
    v_day := least(greatest(p_day_of_month, 1), v_days_in_month);
    v_target_date := make_date(v_year, v_month, v_day);
    v_candidate := (v_target_date::timestamptz at time zone 'utc');

    -- if already passed, move to next month
    if v_candidate <= v_from then
      v_month := v_month + 1;
      if v_month > 12 then
        v_month := 1;
        v_year := v_year + 1;
      end if;

      v_days_in_month := extract(day from (date_trunc('month', make_date(v_year, v_month, 1)) + interval '1 month - 1 day'))::int;
      v_day := least(greatest(p_day_of_month, 1), v_days_in_month);
      v_target_date := make_date(v_year, v_month, v_day);
      v_candidate := (v_target_date::timestamptz at time zone 'utc');
    end if;

    return v_candidate;
  end if;

  if p_frequency = 'yearly'::public.finance_recurring_frequency then
    if p_month_of_year is null or p_day_of_month is null then
      raise exception 'month_of_year and day_of_month are required for yearly frequency';
    end if;

    v_year := v_curr_year;
    v_month := least(greatest(p_month_of_year, 1), 12);

    v_days_in_month := extract(day from (date_trunc('month', make_date(v_year, v_month, 1)) + interval '1 month - 1 day'))::int;
    v_day := least(greatest(p_day_of_month, 1), v_days_in_month);
    v_target_date := make_date(v_year, v_month, v_day);
    v_candidate := (v_target_date::timestamptz at time zone 'utc');

    -- if already passed, go next year
    if v_candidate <= v_from then
      v_year := v_year + 1;
      v_days_in_month := extract(day from (date_trunc('month', make_date(v_year, v_month, 1)) + interval '1 month - 1 day'))::int;
      v_day := least(greatest(p_day_of_month, 1), v_days_in_month);
      v_target_date := make_date(v_year, v_month, v_day);
      v_candidate := (v_target_date::timestamptz at time zone 'utc');
    end if;

    return v_candidate;
  end if;

  -- fallback: tomorrow at midnight
  return (((v_date + 1)::timestamptz) at time zone 'utc');
end;
$$;

-- 4) Trigger: maintain next_run_at automatically
create or replace function public.finance_recurring_set_next_run()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_from timestamptz;
begin
  -- If last_posted_at is set/changed, use it as baseline; otherwise baseline is now()
  v_from := coalesce(new.last_posted_at, now());

  -- Recompute on insert, or if schedule fields changed, or if next_run_at is null
  if tg_op = 'INSERT'
     or new.next_run_at is null
     or new.frequency is distinct from old.frequency
     or new.weekday is distinct from old.weekday
     or new.day_of_month is distinct from old.day_of_month
     or new.month_of_year is distinct from old.month_of_year
     or new.last_posted_at is distinct from old.last_posted_at
     or new.is_active is distinct from old.is_active
  then
    if new.is_active = true then
      new.next_run_at := public.finance_recurring_compute_next_run(
        new.frequency,
        new.weekday,
        new.day_of_month,
        new.month_of_year,
        v_from
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_finance_recurring_set_next_run on public.finance_recurring_expenses;
create trigger trg_finance_recurring_set_next_run
before insert or update on public.finance_recurring_expenses
for each row execute function public.finance_recurring_set_next_run();

commit;
