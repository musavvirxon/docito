create table if not exists public.clinic_rooms (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  name text not null,
  room_number text,
  floor text,
  room_type text not null default 'general',
  status text not null default 'available',
  capacity int not null default 1,
  color text default '#6366f1',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_beds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.clinic_rooms(id) on delete cascade,
  practice_id uuid not null references public.practices(id) on delete cascade,
  bed_number text not null,
  bed_type text not null default 'standard',
  status text not null default 'available',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bed_assignments (
  id uuid primary key default gen_random_uuid(),
  bed_id uuid not null references public.clinic_beds(id) on delete cascade,
  practice_id uuid not null references public.practices(id) on delete cascade,
  patient_id uuid,
  doctor_id uuid references public.doctors(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  assigned_by uuid not null references public.profiles(id),
  admitted_at timestamptz not null default now(),
  discharged_at timestamptz,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_clinic_rooms_practice on public.clinic_rooms(practice_id);
create index if not exists idx_clinic_beds_room on public.clinic_beds(room_id);
create index if not exists idx_clinic_beds_practice on public.clinic_beds(practice_id);
create index if not exists idx_bed_assignments_bed on public.bed_assignments(bed_id);
create index if not exists idx_bed_assignments_practice on public.bed_assignments(practice_id);
create index if not exists idx_bed_assignments_patient on public.bed_assignments(patient_id);
create index if not exists idx_bed_assignments_status on public.bed_assignments(status);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_clinic_rooms_updated_at on public.clinic_rooms;
create trigger trg_clinic_rooms_updated_at before update on public.clinic_rooms
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_clinic_beds_updated_at on public.clinic_beds;
create trigger trg_clinic_beds_updated_at before update on public.clinic_beds
  for each row execute procedure public.set_updated_at();

grant select, insert, update, delete on public.clinic_rooms to authenticated;
grant select, insert, update, delete on public.clinic_beds to authenticated;
grant select, insert, update, delete on public.bed_assignments to authenticated;
grant all on public.clinic_rooms to service_role;
grant all on public.clinic_beds to service_role;
grant all on public.bed_assignments to service_role;

alter table public.clinic_rooms enable row level security;
alter table public.clinic_beds enable row level security;
alter table public.bed_assignments enable row level security;

drop policy if exists "clinic_rooms_select" on public.clinic_rooms;
create policy "clinic_rooms_select" on public.clinic_rooms for select using (
  practice_id in (
    select practice_id from public.clinic_staff where user_id = auth.uid() and status = 'active'
    union select id from public.practices where admin_id = auth.uid()
    union select practice_id from public.doctors where user_id = auth.uid()
  )
);

drop policy if exists "clinic_rooms_insert" on public.clinic_rooms;
create policy "clinic_rooms_insert" on public.clinic_rooms for insert with check (
  practice_id in (
    select id from public.practices where admin_id = auth.uid()
    union select practice_id from public.clinic_staff
      where user_id = auth.uid() and status = 'active'
        and staff_role in ('clinic_admin','manager','receptionist','nurse')
  )
);

drop policy if exists "clinic_rooms_update" on public.clinic_rooms;
create policy "clinic_rooms_update" on public.clinic_rooms for update using (
  practice_id in (
    select id from public.practices where admin_id = auth.uid()
    union select practice_id from public.clinic_staff
      where user_id = auth.uid() and status = 'active'
        and staff_role in ('clinic_admin','manager','receptionist','nurse')
  )
);

drop policy if exists "clinic_rooms_delete" on public.clinic_rooms;
create policy "clinic_rooms_delete" on public.clinic_rooms for delete using (
  practice_id in (select id from public.practices where admin_id = auth.uid())
);

drop policy if exists "clinic_beds_select" on public.clinic_beds;
create policy "clinic_beds_select" on public.clinic_beds for select using (
  practice_id in (
    select practice_id from public.clinic_staff where user_id = auth.uid() and status = 'active'
    union select id from public.practices where admin_id = auth.uid()
    union select practice_id from public.doctors where user_id = auth.uid()
  )
);

drop policy if exists "clinic_beds_insert" on public.clinic_beds;
create policy "clinic_beds_insert" on public.clinic_beds for insert with check (
  practice_id in (
    select id from public.practices where admin_id = auth.uid()
    union select practice_id from public.clinic_staff
      where user_id = auth.uid() and status = 'active'
        and staff_role in ('clinic_admin','manager')
  )
);

drop policy if exists "clinic_beds_update" on public.clinic_beds;
create policy "clinic_beds_update" on public.clinic_beds for update using (
  practice_id in (
    select id from public.practices where admin_id = auth.uid()
    union select practice_id from public.clinic_staff
      where user_id = auth.uid() and status = 'active'
        and staff_role in ('clinic_admin','manager','receptionist','nurse')
    union select practice_id from public.doctors where user_id = auth.uid()
  )
);

drop policy if exists "clinic_beds_delete" on public.clinic_beds;
create policy "clinic_beds_delete" on public.clinic_beds for delete using (
  practice_id in (select id from public.practices where admin_id = auth.uid())
);

drop policy if exists "bed_assignments_select" on public.bed_assignments;
create policy "bed_assignments_select" on public.bed_assignments for select using (
  practice_id in (
    select practice_id from public.clinic_staff where user_id = auth.uid() and status = 'active'
    union select id from public.practices where admin_id = auth.uid()
    union select practice_id from public.doctors where user_id = auth.uid()
  )
);

drop policy if exists "bed_assignments_insert" on public.bed_assignments;
create policy "bed_assignments_insert" on public.bed_assignments for insert with check (assigned_by = auth.uid());

drop policy if exists "bed_assignments_update" on public.bed_assignments;
create policy "bed_assignments_update" on public.bed_assignments for update using (
  practice_id in (
    select id from public.practices where admin_id = auth.uid()
    union select practice_id from public.clinic_staff
      where user_id = auth.uid() and status = 'active'
        and staff_role in ('clinic_admin','manager','receptionist','nurse')
    union select practice_id from public.doctors where user_id = auth.uid()
  )
);

do $$ begin
  begin alter publication supabase_realtime add table public.clinic_rooms; exception when others then null; end;
  begin alter publication supabase_realtime add table public.clinic_beds; exception when others then null; end;
  begin alter publication supabase_realtime add table public.bed_assignments; exception when others then null; end;
end $$;
