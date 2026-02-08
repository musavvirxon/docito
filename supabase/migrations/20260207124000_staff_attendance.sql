-- File: supabase/migrations/20260207124000_staff_attendance.sql

/*
  Step 8: Attendance (clock-in / clock-out) for hourly wages
  - New migration (unique timestamp)
  - Idempotent SQL
  - RLS enabled + policies using public.has_entity_access(entity_type, entity_id)
  - Supports admin marking arrivals/departures, and allows staff to view their own logs.

  Design:
  - staff_attendance_shifts: one row per shift (clock_in/clock_out)
  - staff_attendance_events: optional audit trail for edits (admin corrections)
*/

create extension if not exists pgcrypto;

-- -----------------------------
-- staff_attendance_shifts
-- -----------------------------
create table if not exists public.staff_attendance_shifts (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null, -- 'practice' | 'lab' | 'pharmacy' | 'imaging_center'
  entity_id uuid not null,

  user_id uuid not null,

  clock_in_at timestamptz not null,
  clock_out_at timestamptz,

  -- computed or stored duration (minutes); can be filled by edge function or client
  duration_minutes integer,

  -- who recorded / edited the shift
  recorded_by uuid default auth.uid(),

  -- manual flags / notes
  is_manual boolean not null default false,
  notes text,

  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'staff_attendance_shifts_entity_type_chk'
  ) then
    alter table public.staff_attendance_shifts
      add constraint staff_attendance_shifts_entity_type_chk
      check (entity_type in ('practice','lab','pharmacy','imaging_center'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'staff_attendance_shifts_clock_order_chk'
  ) then
    alter table public.staff_attendance_shifts
      add constraint staff_attendance_shifts_clock_order_chk
      check (clock_out_at is null or clock_out_at >= clock_in_at);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'staff_attendance_shifts_duration_nonneg_chk'
  ) then
    alter table public.staff_attendance_shifts
      add constraint staff_attendance_shifts_duration_nonneg_chk
      check (duration_minutes is null or duration_minutes >= 0);
  end if;
end $$;

-- One open shift per user per entity at a time (partial unique index)
create unique index if not exists staff_attendance_one_open_shift
  on public.staff_attendance_shifts (entity_type, entity_id, user_id)
  where clock_out_at is null;

create index if not exists staff_attendance_entity_idx
  on public.staff_attendance_shifts (entity_type, entity_id, clock_in_at desc);

create index if not exists staff_attendance_user_idx
  on public.staff_attendance_shifts (user_id, clock_in_at desc);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'tg_staff_attendance_shifts_updated'
  ) then
    create trigger tg_staff_attendance_shifts_updated
    before update on public.staff_attendance_shifts
    for each row
    execute function public.tg_set_updated_columns();
  end if;
end $$;

alter table public.staff_attendance_shifts enable row level security;

do $$
begin
  -- SELECT: entity access OR user owns the row
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_attendance_shifts'
      and policyname = 'staff_attendance_shifts_select'
  ) then
    create policy staff_attendance_shifts_select
      on public.staff_attendance_shifts
      for select
      to authenticated
      using (
        auth.uid() is not null
        and (
          public.has_entity_access(entity_type, entity_id)
          or user_id = auth.uid()
        )
      );
  end if;

  -- INSERT: entity access OR user inserting own shift
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_attendance_shifts'
      and policyname = 'staff_attendance_shifts_insert'
  ) then
    create policy staff_attendance_shifts_insert
      on public.staff_attendance_shifts
      for insert
      to authenticated
      with check (
        auth.uid() is not null
        and (
          public.has_entity_access(entity_type, entity_id)
          or user_id = auth.uid()
        )
        and (created_by is null or created_by = auth.uid())
      );
  end if;

  -- UPDATE: entity access (admins/managers), OR user updating their own open shift (clocking out)
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_attendance_shifts'
      and policyname = 'staff_attendance_shifts_update'
  ) then
    create policy staff_attendance_shifts_update
      on public.staff_attendance_shifts
      for update
      to authenticated
      using (
        auth.uid() is not null
        and (
          public.has_entity_access(entity_type, entity_id)
          or (user_id = auth.uid())
        )
      )
      with check (
        auth.uid() is not null
        and (
          public.has_entity_access(entity_type, entity_id)
          or (user_id = auth.uid())
        )
      );
  end if;

  -- DELETE: entity access only
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_attendance_shifts'
      and policyname = 'staff_attendance_shifts_delete'
  ) then
    create policy staff_attendance_shifts_delete
      on public.staff_attendance_shifts
      for delete
      to authenticated
      using (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
      );
  end if;
end $$;

-- -----------------------------
-- staff_attendance_events (audit trail)
-- -----------------------------
create table if not exists public.staff_attendance_events (
  id uuid primary key default gen_random_uuid(),

  shift_id uuid not null references public.staff_attendance_shifts(id) on delete cascade,

  entity_type text not null,
  entity_id uuid not null,
  user_id uuid not null,

  event_type text not null, -- 'clock_in' | 'clock_out' | 'edit' | 'delete'
  event_at timestamptz not null default now(),
  actor_id uuid default auth.uid(),

  before jsonb,
  after jsonb,

  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'staff_attendance_events_entity_type_chk'
  ) then
    alter table public.staff_attendance_events
      add constraint staff_attendance_events_entity_type_chk
      check (entity_type in ('practice','lab','pharmacy','imaging_center'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'staff_attendance_events_type_chk'
  ) then
    alter table public.staff_attendance_events
      add constraint staff_attendance_events_type_chk
      check (event_type in ('clock_in','clock_out','edit','delete'));
  end if;
end $$;

create index if not exists staff_attendance_events_shift_idx
  on public.staff_attendance_events (shift_id, event_at desc);

create index if not exists staff_attendance_events_entity_idx
  on public.staff_attendance_events (entity_type, entity_id, event_at desc);

alter table public.staff_attendance_events enable row level security;

do $$
begin
  -- SELECT: entity access OR user owns
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_attendance_events'
      and policyname = 'staff_attendance_events_select'
  ) then
    create policy staff_attendance_events_select
      on public.staff_attendance_events
      for select
      to authenticated
      using (
        auth.uid() is not null
        and (
          public.has_entity_access(entity_type, entity_id)
          or user_id = auth.uid()
        )
      );
  end if;

  -- INSERT: entity access OR user owns (for clock in/out)
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_attendance_events'
      and policyname = 'staff_attendance_events_insert'
  ) then
    create policy staff_attendance_events_insert
      on public.staff_attendance_events
      for insert
      to authenticated
      with check (
        auth.uid() is not null
        and (
          public.has_entity_access(entity_type, entity_id)
          or user_id = auth.uid()
        )
        and (created_by is null or created_by = auth.uid())
      );
  end if;

  -- UPDATE/DELETE not needed for audit table; lock them down (no policies => denied)
end $$;
