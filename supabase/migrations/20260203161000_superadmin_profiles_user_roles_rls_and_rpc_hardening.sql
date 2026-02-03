-- supabase/migrations/20260203161000_superadmin_profiles_user_roles_rls_and_rpc_hardening.sql
begin;

-- ---------------------------------------------------------
-- 1) Harden helper function to work even if RLS is enabled
-- ---------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'super_admin'
  );
$$;

-- ---------------------------------------------------------
-- 2) RLS: allow super admins to read profiles + user_roles
--    (useful for future direct queries; Edge Function still uses service role)
-- ---------------------------------------------------------

-- profiles
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_super_admin" on public.profiles;
create policy "profiles_select_super_admin"
on public.profiles
for select
to authenticated
using (public.is_super_admin());

-- user_roles
alter table public.user_roles enable row level security;

drop policy if exists "user_roles_select_super_admin" on public.user_roles;
create policy "user_roles_select_super_admin"
on public.user_roles
for select
to authenticated
using (public.is_super_admin());

commit;
