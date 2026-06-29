-- ============================================================
-- Room & Bed Management System
-- ============================================================

-- 1. clinic_rooms
create table if not exists public.clinic_rooms (
  id            uuid primary key default gen_random_uuid(),
  practice_id   uuid not null references public.practices(id) on delete cascade,
  name          text not null,
  room_number   text,
  floor         text,
  room_type     text not null default 'general',
  -- general | icu | private | ward | operating | recovery | consultation | pediatric
  status        text not null default 'available',
  -- available | occupied | cleaning | maintenance | closed
  capacity      int not null default 1,
  color         text default '#6366f1',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. clinic_beds
create table if not exists public.clinic_beds (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.clinic_rooms(id) on delete cascade,
  practice_id   uuid not null references public.practices(id) on delete cascade,
  bed_number    text not null,
  bed_type      text not null default 'standard',
  -- standard | icu | pediatric | bariatric | adjustable
  status        text not null default 'available',
  -- available | occupied | reserved | cleaning | maintenance
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 3. bed_assignments
create table if not exists public.bed_assignments (
  id              uuid primary key default gen_random_uuid(),
  bed_id          uuid not null references public.clinic_beds(id) on delete cascade,
  practice_id     uuid not null references public.practices(id) on delete cascade,
  patient_id      uuid references public.patients(id) on delete set null,
  doctor_id       uuid references public.doctors(id) on delete set null,
  appointment_id  uuid references public.appointments(id) on delete set null,
  assigned_by     uuid not null references public.profiles(id),
  admitted_at     timestamptz not null default now(),
  discharged_at   timestamptz,
  status          text not null default 'active', -- active | discharged
  notes           text,
  created_at      timestamptz not null default now()
);

-- Indexes
create index if not exists idx_clinic_rooms_practice on public.clinic_rooms(practice_id);
create index if not exists idx_clinic_beds_room on public.clinic_beds(room_id);
create index if not exists idx_clinic_beds_practice on public.clinic_beds(practice_id);
create index if not exists idx_bed_assignments_bed on public.bed_assignments(bed_id);
create index if not exists idx_bed_assignments_practice on public.bed_assignments(practice_id);
create index if not exists idx_bed_assignments_patient on public.bed_assignments(patient_id);
create index if not exists idx_bed_assignments_status on public.bed_assignments(status);

-- updated_at triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_clinic_rooms_updated_at
  before update on public.clinic_rooms
  for each row execute procedure public.set_updated_at();

create trigger trg_clinic_beds_updated_at
  before update on public.clinic_beds
  for each row execute procedure public.set_updated_at();

-- Enable RLS
alter table public.clinic_rooms      enable row level security;
alter table public.clinic_beds       enable row level security;
alter table public.bed_assignments   enable row level security;

-- RLS policies — same-practice access
create policy "clinic_rooms_select" on public.clinic_rooms
  for select using (
    practice_id in (
      select practice_id from public.clinic_staff where user_id = auth.uid() and status = 'active'
      union
      select id from public.practices where admin_id = auth.uid()
      union
      select practice_id from public.doctors where user_id = auth.uid()
    )
  );

create policy "clinic_rooms_insert" on public.clinic_rooms
  for insert with check (
    practice_id in (
      select id from public.practices where admin_id = auth.uid()
      union
      select practice_id from public.clinic_staff
        where user_id = auth.uid() and status = 'active'
          and role in ('clinic_admin', 'manager', 'receptionist', 'nurse')
    )
  );

create policy "clinic_rooms_update" on public.clinic_rooms
  for update using (
    practice_id in (
      select id from public.practices where admin_id = auth.uid()
      union
      select practice_id from public.clinic_staff
        where user_id = auth.uid() and status = 'active'
          and role in ('clinic_admin', 'manager', 'receptionist', 'nurse')
    )
  );

create policy "clinic_rooms_delete" on public.clinic_rooms
  for delete using (
    practice_id in (
      select id from public.practices where admin_id = auth.uid()
    )
  );

-- Repeat for clinic_beds
create policy "clinic_beds_select" on public.clinic_beds
  for select using (
    practice_id in (
      select practice_id from public.clinic_staff where user_id = auth.uid() and status = 'active'
      union
      select id from public.practices where admin_id = auth.uid()
      union
      select practice_id from public.doctors where user_id = auth.uid()
    )
  );

create policy "clinic_beds_insert" on public.clinic_beds
  for insert with check (
    practice_id in (
      select id from public.practices where admin_id = auth.uid()
      union
      select practice_id from public.clinic_staff
        where user_id = auth.uid() and status = 'active'
          and role in ('clinic_admin', 'manager')
    )
  );

create policy "clinic_beds_update" on public.clinic_beds
  for update using (
    practice_id in (
      select id from public.practices where admin_id = auth.uid()
      union
      select practice_id from public.clinic_staff
        where user_id = auth.uid() and status = 'active'
          and role in ('clinic_admin', 'manager', 'receptionist', 'nurse')
      union
      select practice_id from public.doctors where user_id = auth.uid()
    )
  );

create policy "clinic_beds_delete" on public.clinic_beds
  for delete using (
    practice_id in (
      select id from public.practices where admin_id = auth.uid()
    )
  );

-- bed_assignments
create policy "bed_assignments_select" on public.bed_assignments
  for select using (
    practice_id in (
      select practice_id from public.clinic_staff where user_id = auth.uid() and status = 'active'
      union
      select id from public.practices where admin_id = auth.uid()
      union
      select practice_id from public.doctors where user_id = auth.uid()
    )
  );

create policy "bed_assignments_insert" on public.bed_assignments
  for insert with check (assigned_by = auth.uid());

create policy "bed_assignments_update" on public.bed_assignments
  for update using (
    practice_id in (
      select id from public.practices where admin_id = auth.uid()
      union
      select practice_id from public.clinic_staff
        where user_id = auth.uid() and status = 'active'
          and role in ('clinic_admin', 'manager', 'receptionist', 'nurse')
      union
      select practice_id from public.doctors where user_id = auth.uid()
    )
  );

-- Enable realtime
alter publication supabase_realtime add table public.clinic_rooms;
alter publication supabase_realtime add table public.clinic_beds;
alter publication supabase_realtime add table public.bed_assignments;
