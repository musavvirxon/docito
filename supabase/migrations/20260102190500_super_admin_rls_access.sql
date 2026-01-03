begin;

-- Helper already created: public.is_super_admin()

-- PRACTICES
alter table public.practices enable row level security;
drop policy if exists "practices_select_super_admin" on public.practices;
create policy "practices_select_super_admin"
on public.practices for select
to authenticated
using (public.is_super_admin());

drop policy if exists "practices_update_super_admin" on public.practices;
create policy "practices_update_super_admin"
on public.practices for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

-- DOCTORS
alter table public.doctors enable row level security;
drop policy if exists "doctors_select_super_admin" on public.doctors;
create policy "doctors_select_super_admin"
on public.doctors for select
to authenticated
using (public.is_super_admin());

drop policy if exists "doctors_update_super_admin" on public.doctors;
create policy "doctors_update_super_admin"
on public.doctors for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

-- PROFILES (for joins)
alter table public.profiles enable row level security;
drop policy if exists "profiles_select_super_admin" on public.profiles;
create policy "profiles_select_super_admin"
on public.profiles for select
to authenticated
using (public.is_super_admin());

-- APPOINTMENTS
alter table public.appointments enable row level security;
drop policy if exists "appointments_select_super_admin" on public.appointments;
create policy "appointments_select_super_admin"
on public.appointments for select
to authenticated
using (public.is_super_admin());

-- PAYMENTS
alter table public.payments enable row level security;
drop policy if exists "payments_select_super_admin" on public.payments;
create policy "payments_select_super_admin"
on public.payments for select
to authenticated
using (public.is_super_admin());

-- REFERRALS
alter table public.referrals enable row level security;
drop policy if exists "referrals_select_super_admin" on public.referrals;
create policy "referrals_select_super_admin"
on public.referrals for select
to authenticated
using (public.is_super_admin());

commit;
