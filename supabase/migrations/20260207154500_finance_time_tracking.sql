-- File: supabase/migrations/20260207154500_finance_time_tracking.sql
-- Step 33: Time tracking (clock in/out) + daily attendance summaries
-- - Used later for hourly payroll generation + admin validation
-- Idempotent migration

begin;

-- 1) Time tracking sessions (clock in/out)
create table if not exists public.staff_time_sessions (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null, -- 'clinic' | 'lab' | 'imaging' | 'pharmacy'
  entity_id uuid not null,

  staff_user_id uuid not null references auth.users(id) on delete cascade,

  clock_in_at timestamptz not null default now(),
  clock_out_at timestamptz null,

  -- Optional: admin edits + notes
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz null,

  source text null, -- 'mobile' | 'web' | 'admin'
  notes text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint staff_time_sessions_clock_order check (clock_out_at is null or clock_out_at > clock_in_at)
);

create index if not exists staff_time_sessions_entity_idx
  on public.staff_time_sessions(entity_type, entity_id);

create index if not exists staff_time_sessions_staff_idx
  on public.staff_time_sessions(staff_user_id, clock_in_at desc);

create index if not exists staff_time_sessions_open_idx
  on public.staff_time_sessions(entity_type, entity_id, staff_user_id)
  where clock_out_at is null;

alter table public.staff_time_sessions enable row level security;

-- 2) Daily attendance (materialized table for fast payroll periods)
create table if not exists public.staff_daily_attendance (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null,
  entity_id uuid not null,
  staff_user_id uuid not null references auth.users(id) on delete cascade,

  work_date date not null, -- local date for the entity (we store derived date; for simplicity use UTC date)
  minutes_worked integer not null default 0 check (minutes_worked >= 0),

  -- rollups
  first_clock_in_at timestamptz null,
  last_clock_out_at timestamptz null,

  -- admin flags
  is_approved boolean not null default false,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists staff_daily_attendance_unique
  on public.staff_daily_attendance(entity_type, entity_id, staff_user_id, work_date);

create index if not exists staff_daily_attendance_entity_idx
  on public.staff_daily_attendance(entity_type, entity_id, work_date);

create index if not exists staff_daily_attendance_staff_idx
  on public.staff_daily_attendance(staff_user_id, work_date desc);

alter table public.staff_daily_attendance enable row level security;

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

drop trigger if exists trg_staff_time_sessions_updated_at on public.staff_time_sessions;
create trigger trg_staff_time_sessions_updated_at
before update on public.staff_time_sessions
for each row execute function public.set_updated_at();

drop trigger if exists trg_staff_daily_attendance_updated_at on public.staff_daily_attendance;
create trigger trg_staff_daily_attendance_updated_at
before update on public.staff_daily_attendance
for each row execute function public.set_updated_at();

-- 4) RLS policies
-- staff_time_sessions:
-- - Staff can see their own sessions
-- - Admin-like (via can_access_entity) can see all for entity
drop policy if exists "staff_time_sessions_select" on public.staff_time_sessions;
create policy "staff_time_sessions_select"
on public.staff_time_sessions
for select
to authenticated
using (
  (staff_user_id = auth.uid())
  or public.can_access_entity(entity_type, entity_id)
);

drop policy if exists "staff_time_sessions_insert" on public.staff_time_sessions;
create policy "staff_time_sessions_insert"
on public.staff_time_sessions
for insert
to authenticated
with check (
  staff_user_id = auth.uid()
  and public.can_access_entity(entity_type, entity_id)
);

drop policy if exists "staff_time_sessions_update" on public.staff_time_sessions;
create policy "staff_time_sessions_update"
on public.staff_time_sessions
for update
to authenticated
using (
  (staff_user_id = auth.uid())
  or public.can_access_entity(entity_type, entity_id)
)
with check (
  (staff_user_id = auth.uid())
  or public.can_access_entity(entity_type, entity_id)
);

drop policy if exists "staff_time_sessions_delete" on public.staff_time_sessions;
create policy "staff_time_sessions_delete"
on public.staff_time_sessions
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

-- staff_daily_attendance:
-- - staff sees own daily summary
-- - admins can see all for entity
drop policy if exists "staff_daily_attendance_select" on public.staff_daily_attendance;
create policy "staff_daily_attendance_select"
on public.staff_daily_attendance
for select
to authenticated
using (
  (staff_user_id = auth.uid())
  or public.can_access_entity(entity_type, entity_id)
);

drop policy if exists "staff_daily_attendance_insert" on public.staff_daily_attendance;
create policy "staff_daily_attendance_insert"
on public.staff_daily_attendance
for insert
to authenticated
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "staff_daily_attendance_update" on public.staff_daily_attendance;
create policy "staff_daily_attendance_update"
on public.staff_daily_attendance
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "staff_daily_attendance_delete" on public.staff_daily_attendance;
create policy "staff_daily_attendance_delete"
on public.staff_daily_attendance
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

-- 5) RPC: Clock in (prevents multiple open sessions)
create or replace function public.staff_clock_in(
  p_entity_type text,
  p_entity_id uuid,
  p_source text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_open uuid;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if not public.can_access_entity(p_entity_type, p_entity_id) then
    raise exception 'Forbidden';
  end if;

  select id into v_open
  from public.staff_time_sessions
  where entity_type = p_entity_type
    and entity_id = p_entity_id
    and staff_user_id = auth.uid()
    and clock_out_at is null
  limit 1;

  if v_open is not null then
    return v_open;
  end if;

  insert into public.staff_time_sessions(
    entity_type, entity_id, staff_user_id,
    clock_in_at, source, notes, created_by
  )
  values (
    p_entity_type, p_entity_id, auth.uid(),
    now(), p_source, p_notes, auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.staff_clock_in(text, uuid, text, text) from public;
grant execute on function public.staff_clock_in(text, uuid, text, text) to authenticated;

-- 6) RPC: Clock out + upsert daily attendance
create or replace function public.staff_clock_out(
  p_session_id uuid
)
returns table (
  session_id uuid,
  work_date date,
  minutes_worked integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_s public.staff_time_sessions;
  v_minutes integer;
  v_date date;
  v_first timestamptz;
  v_last timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select * into v_s
  from public.staff_time_sessions
  where id = p_session_id;

  if v_s.id is null then
    raise exception 'Session not found';
  end if;

  -- allow self or admin
  if v_s.staff_user_id <> auth.uid() and not public.can_access_entity(v_s.entity_type, v_s.entity_id) then
    raise exception 'Forbidden';
  end if;

  if v_s.clock_out_at is not null then
    -- already closed: recompute daily summary anyway (idempotent)
    v_date := (v_s.clock_in_at at time zone 'utc')::date;
  else
    update public.staff_time_sessions
    set clock_out_at = now()
    where id = p_session_id;

    select * into v_s
    from public.staff_time_sessions
    where id = p_session_id;

    v_date := (v_s.clock_in_at at time zone 'utc')::date;
  end if;

  v_minutes := greatest(0, floor(extract(epoch from (coalesce(v_s.clock_out_at, now()) - v_s.clock_in_at)) / 60)::int);

  -- compute first/last
  select min(clock_in_at), max(clock_out_at)
  into v_first, v_last
  from public.staff_time_sessions
  where entity_type = v_s.entity_type
    and entity_id = v_s.entity_id
    and staff_user_id = v_s.staff_user_id
    and (clock_in_at at time zone 'utc')::date = v_date;

  -- upsert daily summary (sum minutes across all sessions in day)
  insert into public.staff_daily_attendance(
    entity_type, entity_id, staff_user_id, work_date,
    minutes_worked, first_clock_in_at, last_clock_out_at,
    is_approved
  )
  values (
    v_s.entity_type, v_s.entity_id, v_s.staff_user_id, v_date,
    0, v_first, v_last,
    false
  )
  on conflict (entity_type, entity_id, staff_user_id, work_date)
  do update set
    first_clock_in_at = excluded.first_clock_in_at,
    last_clock_out_at = excluded.last_clock_out_at,
    -- minutes will be recomputed below
    updated_at = now();

  -- Recompute total minutes for that day from all sessions
  update public.staff_daily_attendance a
  set minutes_worked = (
    select coalesce(sum(
      greatest(0, floor(extract(epoch from (coalesce(s.clock_out_at, now()) - s.clock_in_at)) / 60)::int)
    ), 0)
    from public.staff_time_sessions s
    where s.entity_type = a.entity_type
      and s.entity_id = a.entity_id
      and s.staff_user_id = a.staff_user_id
      and (s.clock_in_at at time zone 'utc')::date = a.work_date
  )
  where a.entity_type = v_s.entity_type
    and a.entity_id = v_s.entity_id
    and a.staff_user_id = v_s.staff_user_id
    and a.work_date = v_date;

  session_id := v_s.id;
  work_date := v_date;

  select a.minutes_worked into minutes_worked
  from public.staff_daily_attendance a
  where a.entity_type = v_s.entity_type
    and a.entity_id = v_s.entity_id
    and a.staff_user_id = v_s.staff_user_id
    and a.work_date = v_date;

  return next;
end;
$$;

revoke all on function public.staff_clock_out(uuid) from public;
grant execute on function public.staff_clock_out(uuid) to authenticated;

commit;
