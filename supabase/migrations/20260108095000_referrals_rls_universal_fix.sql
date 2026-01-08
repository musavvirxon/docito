begin;

-- Remove old legacy policies that rely on referring_doctor_id / referred_doctor_id
drop policy if exists "Doctors can view referrals they're involved in" on public.referrals;
drop policy if exists "Doctors can create referrals" on public.referrals;
drop policy if exists "Referred doctors can update referral status" on public.referrals;

-- Patient can view their referrals
drop policy if exists "Patients can view their referrals" on public.referrals;
create policy "Patients can view their referrals"
on public.referrals for select
using (patient_id = auth.uid());

-- Referrer can view their referrals (universal)
drop policy if exists "Referrers can view their referrals" on public.referrals;
create policy "Referrers can view their referrals"
on public.referrals for select
using (referrer_user_id = auth.uid());

-- Receiver can view their referrals if receiver_user_id is set
drop policy if exists "Receivers can view their referrals" on public.referrals;
create policy "Receivers can view their referrals"
on public.referrals for select
using (receiver_user_id = auth.uid());

-- Staff receiver-view policies exist already (SELECT). Keep them, but ensure they exist.
-- (They were created in 20251224044156...)

-- INSERT policies for staff creating referrals as referrers
drop policy if exists "Doctors can create universal referrals" on public.referrals;
create policy "Doctors can create universal referrals"
on public.referrals for insert
with check (
  referrer_type = 'doctor'
  and referrer_user_id = auth.uid()
  and exists (
    select 1 from public.doctors d
    where d.id = referrer_entity_id and d.user_id = auth.uid()
  )
);

drop policy if exists "Clinic staff can create universal referrals" on public.referrals;
create policy "Clinic staff can create universal referrals"
on public.referrals for insert
with check (
  referrer_type = 'clinic'
  and referrer_user_id = auth.uid()
  and exists (
    select 1 from public.clinic_staff cs
    where cs.user_id = auth.uid()
      and cs.status = 'active'
      and cs.practice_id = referrer_entity_id
  )
);

drop policy if exists "Lab staff can create universal referrals" on public.referrals;
create policy "Lab staff can create universal referrals"
on public.referrals for insert
with check (
  referrer_type = 'lab'
  and referrer_user_id = auth.uid()
  and exists (
    select 1 from public.lab_staff ls
    where ls.user_id = auth.uid()
      and ls.status = 'active'
      and ls.lab_center_id = referrer_entity_id
  )
);

drop policy if exists "Imaging staff can create universal referrals" on public.referrals;
create policy "Imaging staff can create universal referrals"
on public.referrals for insert
with check (
  referrer_type = 'imaging_center'
  and referrer_user_id = auth.uid()
  and exists (
    select 1 from public.imaging_staff isf
    where isf.user_id = auth.uid()
      and isf.status = 'active'
      and isf.imaging_center_id = referrer_entity_id
  )
);

drop policy if exists "Pharmacy staff can create universal referrals" on public.referrals;
create policy "Pharmacy staff can create universal referrals"
on public.referrals for insert
with check (
  referrer_type = 'pharmacy'
  and referrer_user_id = auth.uid()
  and exists (
    select 1 from public.pharmacy_staff ps
    where ps.user_id = auth.uid()
      and ps.status = 'active'
      and ps.pharmacy_id = referrer_entity_id
  )
);

-- UPDATE policies for receivers (accept/reject/complete, publish slots, etc.)
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

-- Referrers can update to send/cancel their own referrals (status only gate via app)
drop policy if exists "Referrer can update own referrals" on public.referrals;
create policy "Referrer can update own referrals"
on public.referrals for update
using (referrer_user_id = auth.uid())
with check (referrer_user_id = auth.uid());

commit;
