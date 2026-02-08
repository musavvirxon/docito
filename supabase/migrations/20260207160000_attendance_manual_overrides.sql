-- File: supabase/migrations/20260207160000_attendance_manual_overrides.sql
-- Step 35: Manual attendance overrides (admin edits) + audit trail
-- Idempotent migration

begin;

-- 1) Add override fields to staff_daily_attendance
alter table public.staff_daily_attendance
  add column if not exists minutes_override integer null check (minutes_override is null or minutes_override >= 0);

alter table public.staff_daily_attendance
  add column if not exists override_reason text null;

alter table public.staff_daily_attendance
  add column if not exists override_by uuid null references auth.users(id) on delete set null;

alter table public.staff_daily_attendance
  add column if not exists override_at timestamptz null;

-- 2) Audit log table for overrides (and future attendance edits)
create table if not exists public.staff_attendance_audit (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null,
  entity_id uuid not null,

  staff_user_id uuid not null references auth.users(id) on delete cascade,
  work_date date not null,

  action text not null, -- 'set_override' | 'clear_override' | 'approve' | 'unapprove' etc

  -- before/after snapshots (small)
  before jsonb not null default '{}'::jsonb,
  after jsonb not null default '{}'::jsonb,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists staff_attendance_audit_entity_idx
  on public.staff_attendance_audit(entity_type, entity_id, work_date desc);

create index if not exists staff_attendance_audit_staff_idx
  on public.staff_attendance_audit(staff_user_id, work_date desc);

alter table public.staff_attendance_audit enable row level security;

-- RLS: only admins/managers can read audit for entity
drop policy if exists "staff_attendance_audit_select" on public.staff_attendance_audit;
create policy "staff_attendance_audit_select"
on public.staff_attendance_audit
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "staff_attendance_audit_insert" on public.staff_attendance_audit;
create policy "staff_attendance_audit_insert"
on public.staff_attendance_audit
for insert
to authenticated
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "staff_attendance_audit_delete" on public.staff_attendance_audit;
create policy "staff_attendance_audit_delete"
on public.staff_attendance_audit
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "staff_attendance_audit_update" on public.staff_attendance_audit;
create policy "staff_attendance_audit_update"
on public.staff_attendance_audit
for update
to authenticated
using (false)
with check (false);

-- 3) RPC: set/clear override (writes audit row)
create or replace function public.staff_attendance_set_override(
  p_entity_type text,
  p_entity_id uuid,
  p_staff_user_id uuid,
  p_work_date date,
  p_minutes_override integer,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.staff_daily_attendance;
  v_before jsonb;
  v_after jsonb;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if not public.can_access_entity(p_entity_type, p_entity_id) then
    raise exception 'Forbidden';
  end if;

  if p_minutes_override is null or p_minutes_override < 0 then
    raise exception 'Invalid minutes_override';
  end if;

  select * into v_row
  from public.staff_daily_attendance
  where entity_type = p_entity_type
    and entity_id = p_entity_id
    and staff_user_id = p_staff_user_id
    and work_date = p_work_date;

  if v_row.id is null then
    raise exception 'Attendance row not found';
  end if;

  v_before := jsonb_build_object(
    'minutes_worked', v_row.minutes_worked,
    'minutes_override', v_row.minutes_override,
    'override_reason', v_row.override_reason,
    'override_by', v_row.override_by,
    'override_at', v_row.override_at,
    'is_approved', v_row.is_approved,
    'approved_by', v_row.approved_by,
    'approved_at', v_row.approved_at
  );

  update public.staff_daily_attendance
  set minutes_override = p_minutes_override,
      override_reason = nullif(trim(p_reason), ''),
      override_by = auth.uid(),
      override_at = now()
  where id = v_row.id;

  select * into v_row
  from public.staff_daily_attendance
  where id = v_row.id;

  v_after := jsonb_build_object(
    'minutes_worked', v_row.minutes_worked,
    'minutes_override', v_row.minutes_override,
    'override_reason', v_row.override_reason,
    'override_by', v_row.override_by,
    'override_at', v_row.override_at,
    'is_approved', v_row.is_approved,
    'approved_by', v_row.approved_by,
    'approved_at', v_row.approved_at
  );

  insert into public.staff_attendance_audit(
    entity_type, entity_id, staff_user_id, work_date, action,
    before, after, created_by
  )
  values (
    p_entity_type, p_entity_id, p_staff_user_id, p_work_date, 'set_override',
    v_before, v_after, auth.uid()
  );
end;
$$;

revoke all on function public.staff_attendance_set_override(text, uuid, uuid, date, integer, text) from public;
grant execute on function public.staff_attendance_set_override(text, uuid, uuid, date, integer, text) to authenticated;

create or replace function public.staff_attendance_clear_override(
  p_entity_type text,
  p_entity_id uuid,
  p_staff_user_id uuid,
  p_work_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.staff_daily_attendance;
  v_before jsonb;
  v_after jsonb;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if not public.can_access_entity(p_entity_type, p_entity_id) then
    raise exception 'Forbidden';
  end if;

  select * into v_row
  from public.staff_daily_attendance
  where entity_type = p_entity_type
    and entity_id = p_entity_id
    and staff_user_id = p_staff_user_id
    and work_date = p_work_date;

  if v_row.id is null then
    raise exception 'Attendance row not found';
  end if;

  v_before := jsonb_build_object(
    'minutes_worked', v_row.minutes_worked,
    'minutes_override', v_row.minutes_override,
    'override_reason', v_row.override_reason,
    'override_by', v_row.override_by,
    'override_at', v_row.override_at
  );

  update public.staff_daily_attendance
  set minutes_override = null,
      override_reason = null,
      override_by = null,
      override_at = null
  where id = v_row.id;

  select * into v_row
  from public.staff_daily_attendance
  where id = v_row.id;

  v_after := jsonb_build_object(
    'minutes_worked', v_row.minutes_worked,
    'minutes_override', v_row.minutes_override,
    'override_reason', v_row.override_reason,
    'override_by', v_row.override_by,
    'override_at', v_row.override_at
  );

  insert into public.staff_attendance_audit(
    entity_type, entity_id, staff_user_id, work_date, action,
    before, after, created_by
  )
  values (
    p_entity_type, p_entity_id, p_staff_user_id, p_work_date, 'clear_override',
    v_before, v_after, auth.uid()
  );
end;
$$;

revoke all on function public.staff_attendance_clear_override(text, uuid, uuid, date) from public;
grant execute on function public.staff_attendance_clear_override(text, uuid, uuid, date) to authenticated;

commit;
