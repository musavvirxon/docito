begin;

-- ============================================================
-- PART 7B: Mapping tables for dashboards/modals
-- ============================================================

-- Provider (doctor) <-> Location
create table if not exists public.provider_locations (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  location_id uuid not null references public.practice_locations(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (doctor_id, location_id)
);

create index if not exists idx_provider_locations_doctor on public.provider_locations (doctor_id);
create index if not exists idx_provider_locations_location on public.provider_locations (location_id);

alter table public.provider_locations enable row level security;

-- Service (procedure) <-> Location
create table if not exists public.service_locations (
  id uuid primary key default gen_random_uuid(),
  procedure_id uuid not null references public.procedures(id) on delete cascade,
  location_id uuid not null references public.practice_locations(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (procedure_id, location_id)
);

create index if not exists idx_service_locations_procedure on public.service_locations (procedure_id);
create index if not exists idx_service_locations_location on public.service_locations (location_id);

alter table public.service_locations enable row level security;

-- Provider (doctor) <-> Service (procedure)
-- Note: procedures already have dentist_id (single owner), but this table allows richer assignment rules.
create table if not exists public.provider_services (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  procedure_id uuid not null references public.procedures(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (doctor_id, procedure_id)
);

create index if not exists idx_provider_services_doctor on public.provider_services (doctor_id);
create index if not exists idx_provider_services_procedure on public.provider_services (procedure_id);

alter table public.provider_services enable row level security;

-- ------------------------------------------------------------
-- RLS policies: only practice admin/staff can manage mappings
-- We infer practice via joins.
-- ------------------------------------------------------------

-- provider_locations
drop policy if exists "Provider locations: practice access select" on public.provider_locations;
create policy "Provider locations: practice access select"
on public.provider_locations for select
using (
  exists (
    select 1
    from public.practice_locations pl
    where pl.id = provider_locations.location_id
      and public.can_access_practice(pl.practice_id)
  )
  or public.has_role(auth.uid(), 'super_admin'::app_role)
);

drop policy if exists "Provider locations: practice access write" on public.provider_locations;
create policy "Provider locations: practice access write"
on public.provider_locations for all
using (
  exists (
    select 1
    from public.practice_locations pl
    where pl.id = provider_locations.location_id
      and public.can_access_practice(pl.practice_id)
  )
  or public.has_role(auth.uid(), 'super_admin'::app_role)
)
with check (
  exists (
    select 1
    from public.practice_locations pl
    where pl.id = provider_locations.location_id
      and public.can_access_practice(pl.practice_id)
  )
  or public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- service_locations
drop policy if exists "Service locations: practice access select" on public.service_locations;
create policy "Service locations: practice access select"
on public.service_locations for select
using (
  exists (
    select 1
    from public.practice_locations pl
    where pl.id = service_locations.location_id
      and public.can_access_practice(pl.practice_id)
  )
  or public.has_role(auth.uid(), 'super_admin'::app_role)
);

drop policy if exists "Service locations: practice access write" on public.service_locations;
create policy "Service locations: practice access write"
on public.service_locations for all
using (
  exists (
    select 1
    from public.practice_locations pl
    where pl.id = service_locations.location_id
      and public.can_access_practice(pl.practice_id)
  )
  or public.has_role(auth.uid(), 'super_admin'::app_role)
)
with check (
  exists (
    select 1
    from public.practice_locations pl
    where pl.id = service_locations.location_id
      and public.can_access_practice(pl.practice_id)
  )
  or public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- provider_services
drop policy if exists "Provider services: practice access select" on public.provider_services;
create policy "Provider services: practice access select"
on public.provider_services for select
using (
  exists (
    select 1
    from public.procedures prc
    join public.doctors d on d.id = prc.dentist_id
    where prc.id = provider_services.procedure_id
      and public.can_access_practice(d.practice_id)
  )
  or public.has_role(auth.uid(), 'super_admin'::app_role)
);

drop policy if exists "Provider services: practice access write" on public.provider_services;
create policy "Provider services: practice access write"
on public.provider_services for all
using (
  exists (
    select 1
    from public.procedures prc
    join public.doctors d on d.id = prc.dentist_id
    where prc.id = provider_services.procedure_id
      and public.can_access_practice(d.practice_id)
  )
  or public.has_role(auth.uid(), 'super_admin'::app_role)
)
with check (
  exists (
    select 1
    from public.procedures prc
    join public.doctors d on d.id = prc.dentist_id
    where prc.id = provider_services.procedure_id
      and public.can_access_practice(d.practice_id)
  )
  or public.has_role(auth.uid(), 'super_admin'::app_role)
);

commit;
