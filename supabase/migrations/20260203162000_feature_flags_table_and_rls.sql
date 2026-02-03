-- supabase/migrations/20260203162000_feature_flags_table_and_rls.sql
begin;

-- ---------------------------------------------------------
-- 1) Table: feature_flags (idempotent)
-- ---------------------------------------------------------
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text null,
  updated_by uuid null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_feature_flags_updated_at on public.feature_flags;
create trigger trg_feature_flags_updated_at
before update on public.feature_flags
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- 2) RLS
-- - Anyone authenticated can read flags (safe for frontend toggles)
-- - Only super admins can modify
-- ---------------------------------------------------------
alter table public.feature_flags enable row level security;

drop policy if exists "feature_flags_select_authenticated" on public.feature_flags;
create policy "feature_flags_select_authenticated"
on public.feature_flags
for select
to authenticated
using (true);

drop policy if exists "feature_flags_insert_super_admin" on public.feature_flags;
create policy "feature_flags_insert_super_admin"
on public.feature_flags
for insert
to authenticated
with check (public.is_super_admin());

drop policy if exists "feature_flags_update_super_admin" on public.feature_flags;
create policy "feature_flags_update_super_admin"
on public.feature_flags
for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "feature_flags_delete_super_admin" on public.feature_flags;
create policy "feature_flags_delete_super_admin"
on public.feature_flags
for delete
to authenticated
using (public.is_super_admin());

-- ---------------------------------------------------------
-- 3) Seed flags (idempotent)
-- ---------------------------------------------------------
insert into public.feature_flags (key, enabled, description)
values
  ('super_admin_dashboard', true, 'Enable Super Admin dashboard sections'),
  ('provider_verification_queue', true, 'Enable provider verification queue'),
  ('audit_logs', true, 'Enable audit log viewing'),
  ('user_management', true, 'Enable user + role management UI')
on conflict (key) do update
set
  enabled = excluded.enabled,
  description = excluded.description;

commit;
