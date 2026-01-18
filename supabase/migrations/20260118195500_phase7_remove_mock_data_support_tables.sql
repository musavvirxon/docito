-- supabase/migrations/20260118195500_phase7_remove_mock_data_support_tables.sql
-- Phase 7: Remove remaining mock/hardcoded dashboard data by providing real tables
-- for Lab Home Collections and Lab Samples.

begin;

-- Ensure updated_at helper exists (idempotent)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Lab Home Collections
-- -----------------------------------------------------------------------------
create table if not exists public.lab_home_collections (
  id uuid primary key default gen_random_uuid(),
  lab_center_id uuid not null references public.lab_centers(id) on delete cascade,
  order_id text not null default ('HC-' || substr(gen_random_uuid()::text, 1, 8)),
  patient_name text not null,
  patient_phone text,
  address text not null,
  scheduled_date timestamptz not null,
  scheduled_time text,
  collector_id uuid references auth.users(id) on delete set null,
  collector_name text,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lab_home_collections_order_id_unique unique (order_id)
);

create index if not exists idx_lab_home_collections_lab_center_id on public.lab_home_collections(lab_center_id);
create index if not exists idx_lab_home_collections_scheduled_date on public.lab_home_collections(scheduled_date);
create index if not exists idx_lab_home_collections_status on public.lab_home_collections(status);

drop trigger if exists trg_lab_home_collections_updated_at on public.lab_home_collections;
create trigger trg_lab_home_collections_updated_at
before update on public.lab_home_collections
for each row execute function public.set_updated_at();

alter table public.lab_home_collections enable row level security;

-- -----------------------------------------------------------------------------
-- Lab Samples
-- -----------------------------------------------------------------------------
create table if not exists public.lab_samples (
  id uuid primary key default gen_random_uuid(),
  lab_center_id uuid not null references public.lab_centers(id) on delete cascade,
  sample_id text not null default ('SMP-' || substr(gen_random_uuid()::text, 1, 8)),
  order_id text,
  patient_name text not null,
  sample_type text not null,
  collection_time timestamptz,
  received_time timestamptz,
  collector_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending',
  barcode text,
  priority text not null default 'normal',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lab_samples_sample_id_unique unique (sample_id)
);

create index if not exists idx_lab_samples_lab_center_id on public.lab_samples(lab_center_id);
create index if not exists idx_lab_samples_status on public.lab_samples(status);
create index if not exists idx_lab_samples_collection_time on public.lab_samples(collection_time);
create index if not exists idx_lab_samples_barcode on public.lab_samples(barcode);

drop trigger if exists trg_lab_samples_updated_at on public.lab_samples;
create trigger trg_lab_samples_updated_at
before update on public.lab_samples
for each row execute function public.set_updated_at();

alter table public.lab_samples enable row level security;

-- -----------------------------------------------------------------------------
-- RLS policies
-- -----------------------------------------------------------------------------
-- Helper predicate: user can access lab_center_id if they are the lab admin or active staff, or super_admin.
create or replace function public.can_access_lab_center(p_lab_center_id uuid)
returns boolean
language sql
stable
as $$
  select
    public.is_super_admin()
    or exists (
      select 1
      from public.lab_centers lc
      where lc.id = p_lab_center_id
        and lc.admin_id = auth.uid()
    )
    or exists (
      select 1
      from public.lab_staff ls
      where ls.lab_center_id = p_lab_center_id
        and ls.user_id = auth.uid()
        and coalesce(ls.status, 'active') = 'active'
    );
$$;

-- lab_home_collections policies
DO $$
begin
  -- select
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lab_home_collections' and policyname = 'lab_home_collections_select_scoped'
  ) then
    create policy lab_home_collections_select_scoped
    on public.lab_home_collections
    for select
    using (public.can_access_lab_center(lab_center_id));
  end if;

  -- insert
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lab_home_collections' and policyname = 'lab_home_collections_insert_scoped'
  ) then
    create policy lab_home_collections_insert_scoped
    on public.lab_home_collections
    for insert
    with check (public.can_access_lab_center(lab_center_id));
  end if;

  -- update
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lab_home_collections' and policyname = 'lab_home_collections_update_scoped'
  ) then
    create policy lab_home_collections_update_scoped
    on public.lab_home_collections
    for update
    using (public.can_access_lab_center(lab_center_id))
    with check (public.can_access_lab_center(lab_center_id));
  end if;
end $$;

-- lab_samples policies
DO $$
begin
  -- select
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lab_samples' and policyname = 'lab_samples_select_scoped'
  ) then
    create policy lab_samples_select_scoped
    on public.lab_samples
    for select
    using (public.can_access_lab_center(lab_center_id));
  end if;

  -- insert
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lab_samples' and policyname = 'lab_samples_insert_scoped'
  ) then
    create policy lab_samples_insert_scoped
    on public.lab_samples
    for insert
    with check (public.can_access_lab_center(lab_center_id));
  end if;

  -- update
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lab_samples' and policyname = 'lab_samples_update_scoped'
  ) then
    create policy lab_samples_update_scoped
    on public.lab_samples
    for update
    using (public.can_access_lab_center(lab_center_id))
    with check (public.can_access_lab_center(lab_center_id));
  end if;
end $$;

commit;
