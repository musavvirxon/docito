begin;

-- =========================
-- Referrals RLS hard reset
-- =========================

alter table public.referrals enable row level security;

-- ----------------------------------------
-- Drop older/conflicting policies (safe)
-- ----------------------------------------
do $$
declare
  pol record;
begin
  for pol in
    select polname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'referrals'
  loop
    -- We drop only policies that match common referral policy names or anything insert-related legacy.
    -- If you want a full reset, replace this block with unconditional drop for all policies.
    if pol.polname ilike '%referral%' or pol.polname ilike '%doctor%' or pol.polname ilike '%receiver%' or pol.polname ilike '%patient%' then
      execute format('drop policy if exists %I on public.referrals;', pol.polname);
    end if;
  end loop;
end$$;

-- ==========================================================
-- SELECT (visibility) policies
-- ==========================================================
-- Patient can see own referrals
create policy "Referrals: patient can view own"
on public.referrals
for select
using (patient_id = auth.uid());

-- Referrer user can see referrals they created (outgoing)
create policy "Referrals: referrer user can view"
on public.referrals
for select
using (referrer_user_id = auth.uid());

-- Receiver user can see referrals assigned to them
create policy "Referrals: receiver user can view"
on public.referrals
for select
using (receiver_user_id = auth.uid());

-- Clinic receiver: admin OR staff can view incoming
create policy "Referrals: clinic receiver entity can view"
on public.referrals
for select
using (
  receiver_type = 'clinic'
  and (
    exists (
      select 1 from public.practices p
      where p.id = receiver_entity_id
        and p.admin_id = auth.uid()
    )
    or exists (
      select 1 from public.clinic_staff cs
      where cs.practice_id = receiver_entity_id
        and cs.user_id = auth.uid()
        and cs.status = 'active'
    )
  )
);

-- Lab receiver: admin OR staff can view incoming
create policy "Referrals: lab receiver entity can view"
on public.referrals
for select
using (
  receiver_type = 'lab'
  and (
    exists (
      select 1 from public.lab_centers lc
      where lc.id = receiver_entity_id
        and lc.admin_id = auth.uid()
    )
    or exists (
      select 1 from public.lab_staff ls
      where ls.lab_center_id = receiver_entity_id
        and ls.user_id = auth.uid()
        and ls.status = 'active'
    )
  )
);

-- Imaging receiver: admin OR staff can view incoming
create policy "Referrals: imaging receiver entity can view"
on public.referrals
for select
using (
  receiver_type = 'imaging_center'
  and (
    exists (
      select 1 from public.imaging_centers ic
      where ic.id = receiver_entity_id
        and ic.admin_id = auth.uid()
    )
    or exists (
      select 1 from public.imaging_staff isf
      where isf.imaging_center_id = receiver_entity_id
        and isf.user_id = auth.uid()
        and isf.status = 'active'
    )
  )
);

-- Pharmacy receiver: admin OR staff can view incoming
create policy "Referrals: pharmacy receiver entity can view"
on public.referrals
for select
using (
  receiver_type = 'pharmacy'
  and (
    exists (
      select 1 from public.pharmacies ph
      where ph.id = receiver_entity_id
        and ph.admin_id = auth.uid()
    )
    or exists (
      select 1 from public.pharmacy_staff ps
      where ps.pharmacy_id = receiver_entity_id
        and ps.user_id = auth.uid()
        and ps.status = 'active'
    )
  )
);

-- Super admin can view all
create policy "Referrals: super admin can view all"
on public.referrals
for select
using (has_role(auth.uid(), 'super_admin'));

-- ==========================================================
-- INSERT (creation) policies
-- ==========================================================
-- Doctors can create referrals ONLY as doctor referrer, and must own the doctor record.
create policy "Referrals: doctors can create"
on public.referrals
for insert
with check (
  referrer_type = 'doctor'
  and referrer_user_id = auth.uid()
  and exists (
    select 1 from public.doctors d
    where d.id = referrer_entity_id
      and d.user_id = auth.uid()
  )
);

-- Practice admin can create referrals as clinic referrer (NOT staff)
create policy "Referrals: practice admins can create"
on public.referrals
for insert
with check (
  referrer_type = 'clinic'
  and referrer_user_id = auth.uid()
  and exists (
    select 1 from public.practices p
    where p.id = referrer_entity_id
      and p.admin_id = auth.uid()
  )
);

-- Lab admin can create referrals as lab referrer (NOT staff)
create policy "Referrals: lab admins can create"
on public.referrals
for insert
with check (
  referrer_type = 'lab'
  and referrer_user_id = auth.uid()
  and exists (
    select 1 from public.lab_centers lc
    where lc.id = referrer_entity_id
      and lc.admin_id = auth.uid()
  )
);

-- Imaging admin can create referrals as imaging referrer (NOT staff)
create policy "Referrals: imaging admins can create"
on public.referrals
for insert
with check (
  referrer_type = 'imaging_center'
  and referrer_user_id = auth.uid()
  and exists (
    select 1 from public.imaging_centers ic
    where ic.id = referrer_entity_id
      and ic.admin_id = auth.uid()
  )
);

-- Pharmacy admin can create referrals as pharmacy referrer (NOT staff)
create policy "Referrals: pharmacy admins can create"
on public.referrals
for insert
with check (
  referrer_type = 'pharmacy'
  and referrer_user_id = auth.uid()
  and exists (
    select 1 from public.pharmacies ph
    where ph.id = referrer_entity_id
      and ph.admin_id = auth.uid()
  )
);

-- Super admin can insert anything
create policy "Referrals: super admin can create"
on public.referrals
for insert
with check (has_role(auth.uid(), 'super_admin'));

-- ==========================================================
-- UPDATE (receiver-side operations) policies
-- ==========================================================
-- Receiver_user_id can update referral
create policy "Referrals: receiver user can update"
on public.referrals
for update
using (receiver_user_id = auth.uid())
with check (true);

-- Patient can update only safe fields? (optional)
-- For safety, we do NOT allow patient updates here.

-- Referrer can update their referrals (optional)
-- If you do not want referrer edits after send, remove this.
create policy "Referrals: referrer user can update"
on public.referrals
for update
using (referrer_user_id = auth.uid())
with check (true);

-- Receiver entity: clinic staff/admin can update incoming
create policy "Referrals: clinic receiver entity can update"
on public.referrals
for update
using (
  receiver_type = 'clinic'
  and (
    exists (select 1 from public.practices p where p.id = receiver_entity_id and p.admin_id = auth.uid())
    or exists (select 1 from public.clinic_staff cs where cs.practice_id = receiver_entity_id and cs.user_id = auth.uid() and cs.status = 'active')
  )
)
with check (true);

-- Lab staff/admin can update incoming
create policy "Referrals: lab receiver entity can update"
on public.referrals
for update
using (
  receiver_type = 'lab'
  and (
    exists (select 1 from public.lab_centers lc where lc.id = receiver_entity_id and lc.admin_id = auth.uid())
    or exists (select 1 from public.lab_staff ls where ls.lab_center_id = receiver_entity_id and ls.user_id = auth.uid() and ls.status = 'active')
  )
)
with check (true);

-- Imaging staff/admin can update incoming
create policy "Referrals: imaging receiver entity can update"
on public.referrals
for update
using (
  receiver_type = 'imaging_center'
  and (
    exists (select 1 from public.imaging_centers ic where ic.id = receiver_entity_id and ic.admin_id = auth.uid())
    or exists (select 1 from public.imaging_staff isf where isf.imaging_center_id = receiver_entity_id and isf.user_id = auth.uid() and isf.status = 'active')
  )
)
with check (true);

-- Pharmacy staff/admin can update incoming
create policy "Referrals: pharmacy receiver entity can update"
on public.referrals
for update
using (
  receiver_type = 'pharmacy'
  and (
    exists (select 1 from public.pharmacies ph where ph.id = receiver_entity_id and ph.admin_id = auth.uid())
    or exists (select 1 from public.pharmacy_staff ps where ps.pharmacy_id = receiver_entity_id and ps.user_id = auth.uid() and ps.status = 'active')
  )
)
with check (true);

-- Super admin can update anything
create policy "Referrals: super admin can update"
on public.referrals
for update
using (has_role(auth.uid(), 'super_admin'))
with check (true);

commit;
