-- File: supabase/migrations/20260118180000_pharmacy_settings_and_billing_policy.sql

begin;

-- 1) Pharmacy settings (for Settings section)
create table if not exists public.pharmacy_settings (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  timezone text not null default 'UTC',
  billing_currency text not null default 'usd',
  delivery_radius_km numeric not null default 10,
  delivery_fee_cents integer not null default 0,
  free_delivery_threshold_cents integer not null default 0,
  is_24_hours boolean not null default false,
  accepts_online_orders boolean not null default true,
  requires_prescription_verification boolean not null default true,
  notification_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pharmacy_id)
);

create index if not exists idx_pharmacy_settings_pharmacy_id on public.pharmacy_settings(pharmacy_id);

alter table public.pharmacy_settings enable row level security;

-- updated_at trigger (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'update_pharmacy_settings_updated_at'
  ) then
    create trigger update_pharmacy_settings_updated_at
      before update on public.pharmacy_settings
      for each row
      execute function public.update_updated_at_column();
  end if;
end $$;

-- RLS policies (idempotent via exception handler)
do $$
begin
  begin
    create policy "Pharmacy staff can view pharmacy settings"
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
    );
  exception when duplicate_object then null;
  end;

  begin
    create policy "Pharmacy staff can create pharmacy settings"
    on public.pharmacy_settings
    for insert
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
      )
    );
  exception when duplicate_object then null;
  end;

  begin
    create policy "Pharmacy staff can update pharmacy settings"
    on public.pharmacy_settings
    for update
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
      )
    );
  exception when duplicate_object then null;
  end;
end $$;

-- 2) Billing: ensure entity scoping columns exist + index
alter table public.billing_transactions
  add column if not exists entity_type text,
  add column if not exists entity_id uuid;

create index if not exists idx_billing_transactions_entity on public.billing_transactions(entity_type, entity_id);

-- 3) Billing: allow pharmacy admins/staff to SELECT entity-scoped transactions
do $$
begin
  begin
    create policy "Pharmacies can view their entity transactions"
    on public.billing_transactions
    for select
    using (
      billing_transactions.entity_type = 'pharmacy'
      and (
        exists (
          select 1 from public.pharmacies p
          where p.id = billing_transactions.entity_id
          and p.admin_id = auth.uid()
        )
        or exists (
          select 1 from public.pharmacy_staff ps
          where ps.pharmacy_id = billing_transactions.entity_id
          and ps.user_id = auth.uid()
          and ps.status = 'active'
        )
      )
    );
  exception when duplicate_object then null;
  end;
end $$;

commit;
