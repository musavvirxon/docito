begin;

-- -----------------------------------------------------------------------------
-- Goal:
--  - Allow referral CREATE for:
--      * doctors (their own user)
--      * facility admins (practices.admin_id, lab_centers.admin_id, imaging_centers.admin_id, pharmacies.admin_id)
--      * super_admin
--  - Disallow referral CREATE for:
--      * patients
--      * all staff tables (clinic_staff, lab_staff, imaging_staff, pharmacy_staff)
--  - Allow receiver-side management for staff (UPDATE on referrals, manage slots/appointments)
-- -----------------------------------------------------------------------------

-- Ensure referrals has RLS enabled (should already be, but safe)
alter table public.referrals enable row level security;
alter table public.referral_slots enable row level security;
alter table public.referral_appointments enable row level security;

-- -------------------------
-- Referrals: INSERT policies
-- -------------------------

-- Remove any older conflicting create policies
drop policy if exists "Doctors can create referrals" on public.referrals;
drop policy if exists "Doctors can create universal referrals" on public.referrals;
drop policy if exists "Clinic staff can create universal referrals" on public.referrals;
drop policy if exists "Lab staff can create universal referrals" on public.referrals;
drop policy if exists "Imaging staff can create universal referrals" on public.referrals;
drop policy if exists "Pharmacy staff can create universal referrals" on public.referrals;

-- Doctors can create referrals as referrers (doctor entity owned by the user)
create policy "Doctors can create referrals (referrer)"
on public.referrals for insert
with check (
  referrer_type = 'doctor'
  and referrer_user_id = auth.uid()
  and exists (
    select 1 from public.doctors d
    where d.id = referrer_entity_id
      and d.user_id = auth.uid()
  )
);

-- Clinic admins can create referrals (NOT clinic_staff)
create policy "Practice admins can create referrals (referrer)"
on public.referrals for insert
with check (
  referrer_type = 'clinic'
  and referrer_user_id = auth.uid()
  and exists (
    select 1 from public.practices p
    where p.id = referrer_entity_id
      and p.admin_id = auth.uid()
  )
);

-- Lab admins can create referrals (NOT lab_staff)
create policy "Lab admins can create referrals (referrer)"
on public.referrals for insert
with check (
  referrer_type = 'lab'
  and referrer_user_id = auth.uid()
  and exists (
    select 1 from public.lab_centers lc
    where lc.id = referrer_entity_id
      and lc.admin_id = auth.uid()
  )
);

-- Imaging admins can create referrals (NOT imaging_staff)
create policy "Imaging admins can create referrals (referrer)"
on public.referrals for insert
with check (
  referrer_type = 'imaging_center'
  and referrer_user_id = auth.uid()
  and exists (
    select 1 from public.imaging_centers ic
    where ic.id = referrer_entity_id
      and ic.admin_id = auth.uid()
  )
);

-- Pharmacy admins can create referrals (NOT pharmacy_staff)
create policy "Pharmacy admins can create referrals (referrer)"
on public.referrals for insert
with check (
  referrer_type = 'pharmacy'
  and referrer_user_id = auth.uid()
  and exists (
    select 1 from public.pharmacies ph
    where ph.id = referrer_entity_id
      and ph.admin_id = auth.uid()
  )
);

-- Super admins can insert anything
drop policy if exists "Super admins can create referrals" on public.referrals;
create policy "Super admins can create referrals"
on public.referrals for insert
with check (has_role(auth.uid(), 'super_admin'));

-- ------------------------
-- Referrals: UPDATE policies
-- ------------------------

-- Keep/update receiver-side management:
-- allow receiver_user_id user OR staff of receiving entity OR entity admin OR super_admin

drop policy if exists "Receiver user can update referral" on public.referrals;
create policy "Receiver user can update referral"
on public.referrals for update
using (receiver_user_id = auth.uid())
with check (true);

drop policy if exists "Clinic staff can update clinic referrals" on public.referrals;
create policy "Clinic staff can update clinic referrals"
on public.referrals for update
using (
  receiver_type = 'clinic'
  and exists (
    select 1 from public.clinic_staff cs
    where cs.user_id = auth.uid()
      and cs.status = 'active'
      and cs.practice_id = receiver_entity_id
  )
)
with check (true);

drop policy if exists "Lab staff can update lab referrals" on public.referrals;
create policy "Lab staff can update lab referrals"
on public.referrals for update
using (
  receiver_type = 'lab'
  and exists (
    select 1 from public.lab_staff ls
    where ls.user_id = auth.uid()
      and ls.status = 'active'
      and ls.lab_center_id = receiver_entity_id
  )
)
with check (true);

drop policy if exists "Imaging staff can update imaging referrals" on public.referrals;
create policy "Imaging staff can update imaging referrals"
on public.referrals for update
using (
  receiver_type = 'imaging_center'
  and exists (
    select 1 from public.imaging_staff isf
    where isf.user_id = auth.uid()
      and isf.status = 'active'
      and isf.imaging_center_id = receiver_entity_id
  )
)
with check (true);

drop policy if exists "Pharmacy staff can update pharmacy referrals" on public.referrals;
create policy "Pharmacy staff can update pharmacy referrals"
on public.referrals for update
using (
  receiver_type = 'pharmacy'
  and exists (
    select 1 from public.pharmacy_staff ps
    where ps.user_id = auth.uid()
      and ps.status = 'active'
      and ps.pharmacy_id = receiver_entity_id
  )
)
with check (true);

-- Facility admins can update referrals for their entity (receiver side)
drop policy if exists "Practice admin can update clinic referrals" on public.referrals;
create policy "Practice admin can update clinic referrals"
on public.referrals for update
using (
  receiver_type = 'clinic'
  and exists (
    select 1 from public.practices p
    where p.id = receiver_entity_id
      and p.admin_id = auth.uid()
  )
)
with check (true);

drop policy if exists "Lab admin can update lab referrals" on public.referrals;
create policy "Lab admin can update lab referrals"
on public.referrals for update
using (
  receiver_type = 'lab'
  and exists (
    select 1 from public.lab_centers lc
    where lc.id = receiver_entity_id
      and lc.admin_id = auth.uid()
  )
)
with check (true);

drop policy if exists "Imaging admin can update imaging referrals" on public.referrals;
create policy "Imaging admin can update imaging referrals"
on public.referrals for update
using (
  receiver_type = 'imaging_center'
  and exists (
    select 1 from public.imaging_centers ic
    where ic.id = receiver_entity_id
      and ic.admin_id = auth.uid()
  )
)
with check (true);

drop policy if exists "Pharmacy admin can update pharmacy referrals" on public.referrals;
create policy "Pharmacy admin can update pharmacy referrals"
on public.referrals for update
using (
  receiver_type = 'pharmacy'
  and exists (
    select 1 from public.pharmacies ph
    where ph.id = receiver_entity_id
      and ph.admin_id = auth.uid()
  )
)
with check (true);

drop policy if exists "Super admins can update referrals" on public.referrals;
create policy "Super admins can update referrals"
on public.referrals for update
using (has_role(auth.uid(), 'super_admin'))
with check (true);

-- ----------------------------
-- referral_slots: receiver manage (add STAFF support)
-- ----------------------------

drop policy if exists "Receivers can manage slots" on public.referral_slots;

create policy "Receivers can manage slots"
on public.referral_slots for all
using (
  referral_id in (
    select r.id
    from public.referrals r
    where
      -- doctor receiver
      (r.receiver_type = 'doctor' and exists (
        select 1 from public.doctors d
        where d.id = r.receiver_entity_id and d.user_id = auth.uid()
      ))
      -- clinic receiver: admin or staff
      or (r.receiver_type = 'clinic' and (
        exists (select 1 from public.practices p where p.id = r.receiver_entity_id and p.admin_id = auth.uid())
        or exists (select 1 from public.clinic_staff cs where cs.practice_id = r.receiver_entity_id and cs.user_id = auth.uid() and cs.status = 'active')
      ))
      -- lab receiver: admin or staff
      or (r.receiver_type = 'lab' and (
        exists (select 1 from public.lab_centers lc where lc.id = r.receiver_entity_id and lc.admin_id = auth.uid())
        or exists (select 1 from public.lab_staff ls where ls.lab_center_id = r.receiver_entity_id and ls.user_id = auth.uid() and ls.status = 'active')
      ))
      -- imaging receiver: admin or staff
      or (r.receiver_type = 'imaging_center' and (
        exists (select 1 from public.imaging_centers ic where ic.id = r.receiver_entity_id and ic.admin_id = auth.uid())
        or exists (select 1 from public.imaging_staff isf where isf.imaging_center_id = r.receiver_entity_id and isf.user_id = auth.uid() and isf.status = 'active')
      ))
      -- pharmacy receiver: admin or staff
      or (r.receiver_type = 'pharmacy' and (
        exists (select 1 from public.pharmacies ph where ph.id = r.receiver_entity_id and ph.admin_id = auth.uid())
        or exists (select 1 from public.pharmacy_staff ps where ps.pharmacy_id = r.receiver_entity_id and ps.user_id = auth.uid() and ps.status = 'active')
      ))
      -- direct receiver_user_id fallback
      or (r.receiver_user_id = auth.uid())
  )
);

-- --------------------------------
-- referral_appointments: receiver manage (add STAFF support)
-- --------------------------------

drop policy if exists "Receivers can manage referral appointments" on public.referral_appointments;

create policy "Receivers can manage referral appointments"
on public.referral_appointments for all
using (
  referral_id in (
    select r.id
    from public.referrals r
    where
      (r.receiver_type = 'doctor' and exists (
        select 1 from public.doctors d
        where d.id = r.receiver_entity_id and d.user_id = auth.uid()
      ))
      or (r.receiver_type = 'clinic' and (
        exists (select 1 from public.practices p where p.id = r.receiver_entity_id and p.admin_id = auth.uid())
        or exists (select 1 from public.clinic_staff cs where cs.practice_id = r.receiver_entity_id and cs.user_id = auth.uid() and cs.status = 'active')
      ))
      or (r.receiver_type = 'lab' and (
        exists (select 1 from public.lab_centers lc where lc.id = r.receiver_entity_id and lc.admin_id = auth.uid())
        or exists (select 1 from public.lab_staff ls where ls.lab_center_id = r.receiver_entity_id and ls.user_id = auth.uid() and ls.status = 'active')
      ))
      or (r.receiver_type = 'imaging_center' and (
        exists (select 1 from public.imaging_centers ic where ic.id = r.receiver_entity_id and ic.admin_id = auth.uid())
        or exists (select 1 from public.imaging_staff isf where isf.imaging_center_id = r.receiver_entity_id and isf.user_id = auth.uid() and isf.status = 'active')
      ))
      or (r.receiver_type = 'pharmacy' and (
        exists (select 1 from public.pharmacies ph where ph.id = r.receiver_entity_id and ph.admin_id = auth.uid())
        or exists (select 1 from public.pharmacy_staff ps where ps.pharmacy_id = r.receiver_entity_id and ps.user_id = auth.uid() and ps.status = 'active')
      ))
      or (r.receiver_user_id = auth.uid())
  )
);

commit;
