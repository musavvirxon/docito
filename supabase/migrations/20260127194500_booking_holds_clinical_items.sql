-- supabase/migrations/20260127194500_booking_holds_clinical_items.sql
-- Idempotent migration.

-- -----------------------------------------------------------------------------
-- 1) Appointment booking holds
-- -----------------------------------------------------------------------------

create table if not exists public.appointment_booking_holds (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','confirmed','expired','canceled')),
  practice_id uuid null references public.practices(id) on delete set null,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid null references auth.users(id) on delete set null,
  doctor_patient_id uuid null references public.doctor_patients(id) on delete set null,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  appointment_type text null,
  notes text null
);

alter table public.appointment_booking_holds enable row level security;

-- Shared updated_at trigger function (safe to replace)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_appointment_booking_holds_updated_at'
  ) then
    create trigger trg_appointment_booking_holds_updated_at
    before update on public.appointment_booking_holds
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- A pending hold blocks a slot (doctor + date + start_time) while unexpired
create unique index if not exists appointment_booking_holds_slot_unique
on public.appointment_booking_holds (doctor_id, appointment_date, start_time)
where (status = 'pending');

create index if not exists appointment_booking_holds_expires_idx
on public.appointment_booking_holds (expires_at);

-- RLS: patient can see/insert/update their holds; doctor and staff can view holds.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='appointment_booking_holds' and policyname='holds_select_patient'
  ) then
    create policy holds_select_patient
      on public.appointment_booking_holds
      for select
      using (patient_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='appointment_booking_holds' and policyname='holds_select_doctor'
  ) then
    create policy holds_select_doctor
      on public.appointment_booking_holds
      for select
      using (
        exists (
          select 1
          from public.doctors d
          where d.id = appointment_booking_holds.doctor_id
            and d.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='appointment_booking_holds' and policyname='holds_select_staff'
  ) then
    create policy holds_select_staff
      on public.appointment_booking_holds
      for select
      using (
        practice_id is not null and exists (
          select 1
          from public.clinic_staff cs
          where cs.practice_id = appointment_booking_holds.practice_id
            and cs.user_id = auth.uid()
            and cs.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='appointment_booking_holds' and policyname='holds_insert_patient'
  ) then
    create policy holds_insert_patient
      on public.appointment_booking_holds
      for insert
      with check (patient_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='appointment_booking_holds' and policyname='holds_update_patient_cancel'
  ) then
    create policy holds_update_patient_cancel
      on public.appointment_booking_holds
      for update
      using (patient_id = auth.uid())
      with check (patient_id = auth.uid());
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2) Appointment clinical item templates + items
-- -----------------------------------------------------------------------------

create table if not exists public.appointment_clinical_item_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  type text not null check (type in ('procedure','medication','treatment_plan')),
  name text not null,
  description text null,
  default_cost numeric null,
  is_active boolean not null default true
);

alter table public.appointment_clinical_item_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_appointment_clinical_item_templates_updated_at'
  ) then
    create trigger trg_appointment_clinical_item_templates_updated_at
    before update on public.appointment_clinical_item_templates
    for each row execute function public.set_updated_at();
  end if;
end $$;

create index if not exists appointment_clinical_item_templates_doctor_idx
on public.appointment_clinical_item_templates (doctor_id);

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='appointment_clinical_item_templates' and policyname='templates_doctor_rw'
  ) then
    create policy templates_doctor_rw
      on public.appointment_clinical_item_templates
      for all
      using (
        exists (
          select 1
          from public.doctors d
          where d.id = appointment_clinical_item_templates.doctor_id
            and d.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.doctors d
          where d.id = appointment_clinical_item_templates.doctor_id
            and d.user_id = auth.uid()
        )
      );
  end if;
end $$;

create table if not exists public.appointment_clinical_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid null references auth.users(id) on delete set null,
  type text not null check (type in ('procedure','medication','treatment_plan')),
  name text not null,
  description text null,
  quantity integer null,
  dosage text null,
  frequency text null,
  duration text null,
  cost numeric null,
  template_id uuid null references public.appointment_clinical_item_templates(id) on delete set null
);

alter table public.appointment_clinical_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_appointment_clinical_items_updated_at'
  ) then
    create trigger trg_appointment_clinical_items_updated_at
    before update on public.appointment_clinical_items
    for each row execute function public.set_updated_at();
  end if;
end $$;

create index if not exists appointment_clinical_items_appointment_idx
on public.appointment_clinical_items (appointment_id);

create index if not exists appointment_clinical_items_doctor_idx
on public.appointment_clinical_items (doctor_id);

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='appointment_clinical_items' and policyname='clinical_items_doctor_rw'
  ) then
    create policy clinical_items_doctor_rw
      on public.appointment_clinical_items
      for all
      using (
        exists (
          select 1
          from public.doctors d
          join public.appointments a on a.id = appointment_clinical_items.appointment_id
          where d.id = appointment_clinical_items.doctor_id
            and d.user_id = auth.uid()
            and a.doctor_id = d.id
        )
      )
      with check (
        exists (
          select 1
          from public.doctors d
          join public.appointments a on a.id = appointment_clinical_items.appointment_id
          where d.id = appointment_clinical_items.doctor_id
            and d.user_id = auth.uid()
            and a.doctor_id = d.id
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='appointment_clinical_items' and policyname='clinical_items_patient_read'
  ) then
    create policy clinical_items_patient_read
      on public.appointment_clinical_items
      for select
      using (patient_id is not null and patient_id = auth.uid());
  end if;
end $$;
