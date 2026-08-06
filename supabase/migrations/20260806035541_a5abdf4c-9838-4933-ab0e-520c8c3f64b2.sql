CREATE OR REPLACE FUNCTION public.can_manage_patient_billing(_practice_id uuid, _appointment_id uuid, _patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR (_practice_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.practices p
          WHERE p.id = _practice_id AND p.admin_id = auth.uid()))
    OR (_practice_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.clinic_staff cs
          WHERE cs.practice_id = _practice_id
            AND cs.user_id = auth.uid()
            AND cs.status = 'active'
            AND cs.can_manage_billing = true))
    OR (_appointment_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.appointments a
          JOIN public.doctors d ON d.id = a.doctor_id
          WHERE a.id = _appointment_id AND d.user_id = auth.uid()))
    OR (_patient_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.doctor_patients dp
          JOIN public.doctors d ON d.id = dp.doctor_id
          WHERE d.user_id = auth.uid()
            AND dp.id = _patient_id))
    OR (_patient_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.appointments a2
          JOIN public.doctors d2 ON d2.id = a2.doctor_id
          WHERE d2.user_id = auth.uid() AND a2.patient_id = _patient_id))
$$;

REVOKE EXECUTE ON FUNCTION public.can_manage_patient_billing(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_patient_billing(uuid, uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Care team can view patient charges" ON public.billing_transactions;
CREATE POLICY "Care team can view patient charges"
ON public.billing_transactions FOR SELECT TO authenticated
USING (
  patient_id = auth.uid()
  OR public.can_manage_patient_billing(practice_id, appointment_id, patient_id)
);

DROP POLICY IF EXISTS "Care team can insert patient charges" ON public.billing_transactions;
CREATE POLICY "Care team can insert patient charges"
ON public.billing_transactions FOR INSERT TO authenticated
WITH CHECK (public.can_manage_patient_billing(practice_id, appointment_id, patient_id));

DROP POLICY IF EXISTS "Care team can update patient charges" ON public.billing_transactions;
CREATE POLICY "Care team can update patient charges"
ON public.billing_transactions FOR UPDATE TO authenticated
USING (public.can_manage_patient_billing(practice_id, appointment_id, patient_id))
WITH CHECK (public.can_manage_patient_billing(practice_id, appointment_id, patient_id));

DROP POLICY IF EXISTS "Care team can delete patient charges" ON public.billing_transactions;
CREATE POLICY "Care team can delete patient charges"
ON public.billing_transactions FOR DELETE TO authenticated
USING (public.can_manage_patient_billing(practice_id, appointment_id, patient_id));

DROP POLICY IF EXISTS "Care team can manage patient payments" ON public.payments;
CREATE POLICY "Care team can manage patient payments"
ON public.payments FOR ALL TO authenticated
USING (public.can_manage_patient_billing(practice_id, appointment_id, patient_id))
WITH CHECK (public.can_manage_patient_billing(practice_id, appointment_id, patient_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;