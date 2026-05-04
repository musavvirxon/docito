CREATE OR REPLACE FUNCTION public.create_prescription(
  p_patient_id UUID,
  p_doctor_id UUID,
  p_items JSONB,
  p_refills INTEGER DEFAULT 0,
  p_notes TEXT DEFAULT NULL,
  p_appointment_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prescription_id UUID;
  v_item JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM doctors WHERE id = p_doctor_id AND user_id = auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  INSERT INTO prescriptions (patient_id, doctor_id, appointment_id, refills_remaining, refills_total, notes, status)
  VALUES (p_patient_id, p_doctor_id, p_appointment_id, p_refills, p_refills, p_notes, 'pending')
  RETURNING id INTO v_prescription_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO prescription_items (
      prescription_id, medication_name, medication_code, dosage,
      frequency, quantity, unit, instructions, substitutions_allowed
    ) VALUES (
      v_prescription_id,
      v_item->>'medication_name',
      v_item->>'medication_code',
      v_item->>'dosage',
      v_item->>'frequency',
      (v_item->>'quantity')::INTEGER,
      COALESCE(v_item->>'unit', 'tablets'),
      v_item->>'instructions',
      COALESCE((v_item->>'substitutions_allowed')::BOOLEAN, true)
    );
  END LOOP;

  RETURN json_build_object('success', true, 'prescription_id', v_prescription_id);
END;
$$;