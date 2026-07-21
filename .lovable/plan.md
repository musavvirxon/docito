## Problem

The Patients list mixes two overlapping data sources, so most patients render 2–4 times:

- `useDoctorPatients` returns appointment-linked profiles **plus** all `doctor_patients` rows.
- `useDoctorPatientsV2` also returns all `doctor_patients` rows.
- `PatientListSection` concatenates both and tags one copy as "Appointment" and the other as "Added" — so the same person shows up under both labels.

The "Source" badge is also wrong: it's derived from which hook produced the row, not from whether the patient actually has appointments with this doctor. That's why manually created records show as "Appointment" and vice versa.

The database itself is mostly clean, but has a real duplicate:
- Doctor `8fcfe750…`: two `doctor_patients` rows for `fdv / +97160170515` (`c3facf6b…` with 3 appointments, `d2de3019…` with 0). The zero-appointment duplicate should go.

No rows are fully empty today, but the cleanup should also delete any `doctor_patients` row that has no name, phone, email, and DOB (defensive).

## Fix

### 1. One source of truth in the UI

Refactor `src/components/doctor/patients/PatientListSection.tsx` to use **only** `useDoctorPatientsV2` (which reads `doctor_patients` directly). Drop the `useDoctorPatients` import here.

For each patient, compute `hasAppointments` by counting `appointments` where `doctor_patient_id = dp.id` (or `patient_id = dp.id` for legacy rows). Add a lightweight companion hook `useDoctorPatientAppointmentCounts(doctorId)` that returns a `Map<doctor_patient_id, number>` in one query, so we don't run N queries.

Derive the Source badge from that count:
- `count > 0` → "Appointment" / Registered tab
- `count === 0` → "Added" / Manually Added tab

Stats + tab counts recompute from the same single list. `handlePatientClick` always routes to the direct-patient view (`onSelectDirectPatient`) since every row is now a `doctor_patients` row.

`DoctorPatientsSection.tsx` and `useDoctorPatients.ts` are left in place (still used elsewhere, e.g. medical records), only the list screen switches.

### 2. Database cleanup (one migration)

Delete `doctor_patients` rows that are either:
1. Truly empty — no `full_name`, `phone`, `email`, `date_of_birth`.
2. Duplicates within the same `doctor_id` grouped by normalized `(phone, lower(full_name))`, keeping the row with the most appointments (tiebreak: oldest `created_at`). All references (`appointments.doctor_patient_id`, `tooth_procedure_history`, billing, etc.) are re-pointed to the kept row before deleting the losers.

### Technical details

```text
useDoctorPatientsV2 (doctor_patients)
        │
        ▼
useDoctorPatientAppointmentCounts  ──►  Map<id, apptCount>
        │
        ▼
PatientListSection
  type = apptCount > 0 ? 'appointment' : 'direct'
```

Migration outline:

```sql
-- 1. Find duplicate groups
WITH ranked AS (
  SELECT id, doctor_id,
    row_number() OVER (
      PARTITION BY doctor_id, lower(coalesce(full_name,'')), coalesce(regexp_replace(phone,'\D','','g'),'')
      ORDER BY (SELECT count(*) FROM appointments a WHERE a.doctor_patient_id = dp.id) DESC,
               created_at ASC
    ) AS rn
  FROM doctor_patients dp
  WHERE merged_into_user_id IS NULL
    AND (full_name IS NOT NULL OR phone IS NOT NULL)
)
-- 2. Repoint FKs from loser → winner, then delete losers
-- 3. Delete fully-empty rows
DELETE FROM doctor_patients
WHERE merged_into_user_id IS NULL
  AND coalesce(nullif(trim(full_name),''), '') = ''
  AND coalesce(nullif(trim(phone),''), '')     = ''
  AND coalesce(nullif(trim(email),''), '')     = ''
  AND date_of_birth IS NULL;
```

Known concrete duplicate to be resolved by the migration: `d2de3019-fc06-495c-828f-c11962b524c2` (fdv, 0 appts) folds into `c3facf6b-5b80-4b4e-b747-913bff7afb32` (fdv, 3 appts).

## Out of scope

- No changes to appointment booking, staff dashboard patient list, or medical-records fetching.
- No visual redesign of the Patients section beyond fixing the Source badge.
