
-- 1. Identify duplicate groups and pick a winner per group
WITH normalized AS (
  SELECT
    dp.id,
    dp.doctor_id,
    lower(coalesce(trim(dp.full_name), '')) AS norm_name,
    coalesce(regexp_replace(coalesce(dp.phone,''), '\D', '', 'g'), '') AS norm_phone,
    dp.created_at,
    (SELECT count(*) FROM public.appointments a WHERE a.doctor_patient_id = dp.id) AS appt_count
  FROM public.doctor_patients dp
  WHERE dp.merged_into_user_id IS NULL
    AND (coalesce(trim(dp.full_name),'') <> '' OR coalesce(regexp_replace(coalesce(dp.phone,''), '\D','','g'),'') <> '')
),
ranked AS (
  SELECT
    id, doctor_id, norm_name, norm_phone, appt_count, created_at,
    first_value(id) OVER (
      PARTITION BY doctor_id, norm_name, norm_phone
      ORDER BY appt_count DESC, created_at ASC
    ) AS winner_id,
    count(*) OVER (PARTITION BY doctor_id, norm_name, norm_phone) AS group_size
  FROM normalized
),
losers AS (
  SELECT id AS loser_id, winner_id
  FROM ranked
  WHERE group_size > 1 AND id <> winner_id
)
-- 2. Repoint child rows to the winner
, u1 AS (UPDATE public.appointments a SET doctor_patient_id = l.winner_id FROM losers l WHERE a.doctor_patient_id = l.loser_id RETURNING 1)
, u2 AS (UPDATE public.appointment_diagnoses t SET doctor_patient_id = l.winner_id FROM losers l WHERE t.doctor_patient_id = l.loser_id RETURNING 1)
, u3 AS (UPDATE public.appointment_clinical_items t SET doctor_patient_id = l.winner_id FROM losers l WHERE t.doctor_patient_id = l.loser_id RETURNING 1)
, u4 AS (UPDATE public.appointment_holds t SET doctor_patient_id = l.winner_id FROM losers l WHERE t.doctor_patient_id = l.loser_id RETURNING 1)
, u5 AS (UPDATE public.appointment_sessions t SET doctor_patient_id = l.winner_id FROM losers l WHERE t.doctor_patient_id = l.loser_id RETURNING 1)
, u6 AS (UPDATE public.tooth_procedure_history t SET doctor_patient_id = l.winner_id FROM losers l WHERE t.doctor_patient_id = l.loser_id RETURNING 1)
, u7 AS (UPDATE public.treatment_plans t SET doctor_patient_id = l.winner_id FROM losers l WHERE t.doctor_patient_id = l.loser_id RETURNING 1)
, u8 AS (UPDATE public.video_consultations t SET doctor_patient_id = l.winner_id FROM losers l WHERE t.doctor_patient_id = l.loser_id RETURNING 1)
, u9 AS (UPDATE public.referrals t SET doctor_patient_id = l.winner_id FROM losers l WHERE t.doctor_patient_id = l.loser_id RETURNING 1)
, u10 AS (UPDATE public.patient_merge_log t SET doctor_patient_id = l.winner_id FROM losers l WHERE t.doctor_patient_id = l.loser_id RETURNING 1)
-- 3. Mark loser rows as merged (so they disappear from active queries; safer than hard delete)
, d1 AS (
  UPDATE public.doctor_patients dp
  SET merged_into_user_id = l.winner_id, updated_at = now()
  FROM losers l
  WHERE dp.id = l.loser_id
  RETURNING 1
)
SELECT
  (SELECT count(*) FROM losers) AS duplicates_merged;

-- 4. Delete fully-empty rows (no identifying data at all, no children references)
DELETE FROM public.doctor_patients dp
WHERE dp.merged_into_user_id IS NULL
  AND coalesce(nullif(trim(dp.full_name),''), '') = ''
  AND coalesce(nullif(trim(coalesce(dp.phone,'')),''), '') = ''
  AND coalesce(nullif(trim(coalesce(dp.email,'')),''), '') = ''
  AND dp.date_of_birth IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.appointments a WHERE a.doctor_patient_id = dp.id)
  AND NOT EXISTS (SELECT 1 FROM public.tooth_procedure_history t WHERE t.doctor_patient_id = dp.id)
  AND NOT EXISTS (SELECT 1 FROM public.treatment_plans t WHERE t.doctor_patient_id = dp.id);
