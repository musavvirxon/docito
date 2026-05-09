
-- Add missing columns used by the new referrals UI
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS referral_scope text,
  ADD COLUMN IF NOT EXISTS target_field public.referral_entity_type,
  ADD COLUMN IF NOT EXISTS receiver_name text,
  ADD COLUMN IF NOT EXISTS doctor_patient_id uuid;

-- Replace the legacy doctor-only INSERT policy with one based on the new referrer_user_id model
DROP POLICY IF EXISTS "Doctors can create referrals" ON public.referrals;

CREATE POLICY "Referrers can create referrals"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (
  referrer_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.user_id = auth.uid()
      AND (d.id = referrals.referrer_entity_id OR d.id = referrals.referring_doctor_id)
  )
);

-- SELECT: participants (referrer user, receiver user, patient, referrer doctor mapping)
DROP POLICY IF EXISTS "Participants can view referrals" ON public.referrals;
CREATE POLICY "Participants can view referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (
  referrer_user_id = auth.uid()
  OR receiver_user_id = auth.uid()
  OR patient_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.user_id = auth.uid()
      AND (d.id = referrals.referrer_entity_id OR d.id = referrals.receiver_entity_id
           OR d.id = referrals.referring_doctor_id OR d.id = referrals.referred_doctor_id)
  )
);

-- UPDATE: referrer (own) and receiver (assigned) can update
DROP POLICY IF EXISTS "Referrer can update own referral" ON public.referrals;
CREATE POLICY "Referrer can update own referral"
ON public.referrals
FOR UPDATE
TO authenticated
USING (
  referrer_user_id = auth.uid()
  OR receiver_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.user_id = auth.uid()
      AND (d.id = referrals.referrer_entity_id OR d.id = referrals.receiver_entity_id)
  )
);
