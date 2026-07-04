-- ============================================================
-- Waiting room queue display
-- ============================================================
-- Adds: room assignment + queue tracking on appointments, a
-- table for paired physical screens, and a token-based RPC so
-- those screens can read the queue with no staff login.

-- 1. Track where a patient is in their visit today, and which
--    room they're in. Kept separate from `status` (which is
--    about the appointment itself: confirmed/completed/etc.)
--    so we don't touch the existing appointment_status enum.
alter table public.appointments
  add column if not exists room_id       uuid references public.clinic_rooms(id) on delete set null,
  add column if not exists check_in_time timestamptz,
  add column if not exists called_at     timestamptz,
  add column if not exists queue_status  text not null default 'not_arrived';
  -- not_arrived -> arrived -> called -> in_progress
  -- only meaningful when appointment_type = 'in_person'

alter table public.appointments
  add constraint appointments_queue_status_check
  check (queue_status in ('not_arrived', 'arrived', 'called', 'in_progress'));

create index if not exists idx_appointments_practice_date_room
  on public.appointments(practice_id, appointment_date, room_id);

create index if not exists idx_appointments_queue_status
  on public.appointments(practice_id, appointment_date, queue_status);

-- 2. Paired physical screens (TVs, monitors, tablets) that can
--    read the queue without a staff login.
create table public.clinic_displays (
  id           uuid primary key default gen_random_uuid(),
  practice_id  uuid not null references public.practices(id) on delete cascade,
  room_id      uuid references public.clinic_rooms(id) on delete set null, -- null = show every room
  label        text not null default 'Waiting room display',
  token        text not null unique default encode(gen_random_bytes(24), 'hex'),
  is_active    boolean not null default true,
  last_seen_at timestamptz,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);

create index idx_clinic_displays_practice on public.clinic_displays(practice_id);
create index idx_clinic_displays_token on public.clinic_displays(token);

alter table public.clinic_displays enable row level security;

-- Staff/admin can see and manage displays for their own practice.
-- Mirrors the clinic_rooms policies already in this project.
create policy "clinic_displays_select" on public.clinic_displays
  for select using (
    practice_id in (
      select id from public.practices where admin_id = auth.uid()
      union
      select practice_id from public.clinic_staff
        where user_id = auth.uid() and status = 'active'
    )
  );

create policy "clinic_displays_insert" on public.clinic_displays
  for insert with check (
    practice_id in (
      select id from public.practices where admin_id = auth.uid()
      union
      select practice_id from public.clinic_staff
        where user_id = auth.uid() and status = 'active'
          and role in ('clinic_admin', 'manager')
    )
  );

create policy "clinic_displays_update" on public.clinic_displays
  for update using (
    practice_id in (
      select id from public.practices where admin_id = auth.uid()
      union
      select practice_id from public.clinic_staff
        where user_id = auth.uid() and status = 'active'
          and role in ('clinic_admin', 'manager')
    )
  );

create policy "clinic_displays_delete" on public.clinic_displays
  for delete using (
    practice_id in (
      select id from public.practices where admin_id = auth.uid()
    )
  );

-- No anon policy on this table on purpose. The TV never queries it
-- directly — it only ever calls get_queue_display() below, which
-- validates the token itself and hands back just the display JSON.

-- 3. The public read. Given a valid token, return everything the
--    waiting room screen needs. security definer bypasses RLS
--    deliberately — the token IS the auth check, same pattern as
--    get_consultation_by_guest_token for guest video joins.
create or replace function public.get_queue_display(_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _practice_id uuid;
  _room_id     uuid;
begin
  select practice_id, room_id into _practice_id, _room_id
  from public.clinic_displays
  where token = _token and is_active = true;

  if _practice_id is null then
    raise exception 'invalid or revoked display token';
  end if;

  update public.clinic_displays set last_seen_at = now() where token = _token;

  return jsonb_build_object(
    'practice_id', _practice_id,
    'practice_name', (select name from public.practices where id = _practice_id),
    'rooms', (
      select coalesce(jsonb_agg(jsonb_build_object('room_id', id, 'room_name', name) order by name), '[]'::jsonb)
      from public.clinic_rooms
      where practice_id = _practice_id
        and (_room_id is null or id = _room_id)
    ),
    -- Flat list of everyone currently relevant to the queue today.
    -- Grouping into "current / next per room" happens client-side
    -- (see useQueueDisplay) rather than in SQL, on purpose — it's
    -- easier to get right and easier to change later.
    'queue', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'room_id', a.room_id,
        'doctor_name', doc_profile.full_name,
        'patient_name', pat_profile.full_name,
        'queue_status', a.queue_status,
        'called_at', a.called_at,
        'start_time', a.start_time
      ) order by a.start_time), '[]'::jsonb)
      from public.appointments a
      join public.doctors doc on doc.id = a.doctor_id
      join public.profiles doc_profile on doc_profile.user_id = doc.user_id
      left join public.profiles pat_profile on pat_profile.user_id = a.patient_id
      where a.practice_id = _practice_id
        and a.appointment_date = current_date
        and a.appointment_type = 'in_person'
        and a.room_id is not null
        and a.queue_status in ('arrived', 'called', 'in_progress')
        and (_room_id is null or a.room_id = _room_id)
    )
  );
end;
$$;

grant execute on function public.get_queue_display(text) to anon;
grant execute on function public.get_queue_display(text) to authenticated;
