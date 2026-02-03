-- supabase/migrations/20260203154000_superadmin_rls_and_is_super_admin.sql
begin;

-- ---------------------------------------------------------
-- 1) Ensure helper function exists: public.is_super_admin()
-- ---------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'super_admin'
  );
$$;

-- ---------------------------------------------------------
-- 2) RLS: Super admin read access for verification + logs
-- ---------------------------------------------------------

-- doctor_verification
alter table public.doctor_verification enable row level security;

drop policy if exists "doctor_verification_select_super_admin" on public.doctor_verification;
create policy "doctor_verification_select_super_admin"
on public.doctor_verification
for select
to authenticated
using (public.is_super_admin());

-- doctor_verification_documents
alter table public.doctor_verification_documents enable row level security;

drop policy if exists "doctor_verification_documents_select_super_admin" on public.doctor_verification_documents;
create policy "doctor_verification_documents_select_super_admin"
on public.doctor_verification_documents
for select
to authenticated
using (public.is_super_admin());

-- system_audit_logs (super admin read)
alter table public.system_audit_logs enable row level security;

drop policy if exists "system_audit_logs_select_super_admin" on public.system_audit_logs;
create policy "system_audit_logs_select_super_admin"
on public.system_audit_logs
for select
to authenticated
using (public.is_super_admin());

commit;
