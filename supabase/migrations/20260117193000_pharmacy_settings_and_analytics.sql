-- File: supabase/migrations/20260117193000_pharmacy_settings_and_analytics.sql

begin;

-- 1) Pharmacy settings (non-profile) persisted separately from public.pharmacies
create table if not exists public.pharmacy_settings (
  pharmacy_id uuid primary key references public.pharmacies(id) on delete cascade,
  delivery_radius_km numeric(10,2) not null default 10,
  delivery_fee numeric(10,2) not null default 5,
  free_delivery_threshold numeric(10,2) not null default 50,
  is_24_hours boolean not null default false,
  accepts_online_orders boolean not null default true,
  requires_prescription_verification boolean not null default true,
  billing_currency text not null default 'usd',
  timezone text not null default 'UTC',
  notifications jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pharmacy_settings_pharmacy_id on public.pharmacy_settings (pharmacy_id);

alter table public.pharmacy_settings enable row level security;

-- Keep policies idempotent
drop policy if exists "Pharmacy settings: staff can view" on public.pharmacy_settings;
drop policy if exists "Pharmacy settings: admins can upsert" on public.pharmacy_settings;

create policy "Pharmacy settings: staff can view"
on public.pharmacy_settings
for select
using (
  exists (
    select 1 from public.pharmacies p
    where p.id = pharmacy_settings.pharmacy_id
      and p.admin_id = auth.uid()
  )
  or exists (
    select 1 from public.pharmacy_staff ps
    where ps.pharmacy_id = pharmacy_settings.pharmacy_id
      and ps.user_id = auth.uid()
      and ps.status = 'active'
  )
  or has_role(auth.uid(), 'super_admin')
);

create policy "Pharmacy settings: admins can upsert"
on public.pharmacy_settings
for all
using (
  exists (
    select 1 from public.pharmacies p
    where p.id = pharmacy_settings.pharmacy_id
      and p.admin_id = auth.uid()
  )
  or exists (
    select 1 from public.pharmacy_staff ps
    where ps.pharmacy_id = pharmacy_settings.pharmacy_id
      and ps.user_id = auth.uid()
      and ps.status = 'active'
      and ps.staff_role = 'admin'
  )
  or has_role(auth.uid(), 'super_admin')
)
with check (
  exists (
    select 1 from public.pharmacies p
    where p.id = pharmacy_settings.pharmacy_id
      and p.admin_id = auth.uid()
  )
  or exists (
    select 1 from public.pharmacy_staff ps
    where ps.pharmacy_id = pharmacy_settings.pharmacy_id
      and ps.user_id = auth.uid()
      and ps.status = 'active'
      and ps.staff_role = 'admin'
  )
  or has_role(auth.uid(), 'super_admin')
);

-- updated_at trigger
drop trigger if exists update_pharmacy_settings_updated_at on public.pharmacy_settings;
create trigger update_pharmacy_settings_updated_at
before update on public.pharmacy_settings
for each row execute function public.update_updated_at_column();

commit;
