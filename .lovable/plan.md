# Plan

Three independent fixes scoped to the doctor dashboard and patient dashboard.

---

## 1. Referral → Booked status + Patient Dashboard appointment

**Goal:** When a doctor uses "Book" on a referral row, the booked appointment is linked to the referral, the referral flips to `booked`, and the patient sees the new appointment + the linked referral in their dashboard.

**Changes**

- `src/components/doctor/DoctorReferralsSection.tsx`
  - `handleBookFromReferral`: keep current behavior, but pass the active referral id into `ManualBookAppointmentModal` via a new `referralId` prop.
  - After the modal calls `onSuccess`, invoke `supabase.functions.invoke("referral-link-appointment-admin", { body: { referral_id, appointment_id } })` (new admin variant — see below) and `refetch()` the referrals list so the row moves to the `booked` filter/category.

- `src/components/doctor/ManualBookAppointmentModal.tsx`
  - Add optional `referralId?: string | null` prop.
  - Include `referral_id: referralId ?? null` in the insert payload, with the same `insertWithFallback` pattern (delete `referral_id` from the retry if the column is missing).
  - Return the created appointment id from `onSuccess?(appointmentId)` so the parent can call the link function.

- `supabase/functions/referral-link-appointment/index.ts`
  - The current function rejects callers that aren't the patient. Add a sibling function `referral-link-appointment-admin` (verify_jwt=false, service-role client) that authorizes by checking the caller is the doctor/staff bound to `receiver_entity_id`, then performs the same `referral_appointments` upsert and `referrals.status = 'booked'` update. Reuse the same response shape.
  - Alternative: extend the existing function to allow the receiver as well. Same outcome; pick whichever keeps the schema simpler.

- Patient side (already wired)
  - `PatientReferralsSection` → `ReferralsSection role="patient"` already lists referrals and respects `status=booked`. Once the referral row is flipped server-side, it will appear under "Booked" automatically.
  - The patient's appointments query already reads `appointments` by `patient_id`. The newly-inserted row will surface in `PatientDashboard` → Appointments without further code changes, provided `patient_id` is set (registered patients only; manual `doctor_patient_id` patients have no auth account, so they won't show — this matches existing behavior).

---

## 2. Prescriptions: patient list missing

**Root cause:** `CreatorPanel` reads `patients` from `useDoctorPatients()`, which only returns patients with confirmed visits. New referral/manual patients never appear, so the selector is empty.

**Changes**

- `src/hooks/useDoctorPatients.ts`
  - Broaden the source query to also include patients linked via:
    - `appointments` with any status (not just confirmed),
    - `doctor_patients` (manual entries),
    - `referrals` where this doctor is sender or receiver.
  - De-dupe by `user_id`/`doctor_patient_id`. Keep the existing return shape so `CreatorPanel` and `DoctorPrescriptionsSection` work unchanged.

- `src/components/doctor/prescriptions/DoctorPrescriptionsSection.tsx`
  - Add an empty-state hint in the patient `Select` when `patients.length === 0` directing the user to add a patient first (no behavior change otherwise).

- Patient profile linkage
  - Verify `usePatientPrescriptions(patientId)` is mounted in the patient profile/dashboard view. If a prescription is created with the correct `patient_id`, it already appears in the patient profile (the hook reads `medications` filtered by `patient_id`). No schema change required — only confirm the creator passes the registered patient's `user_id` as `patient_id`.

---

## 3. Performance + Financial analytics include session data

**Goal:** Numbers shown in `DoctorPerformanceSection` and `DoctorFinancialStatsSection` count appointments that have an associated session (in-progress, completed, or with recorded session minutes), not only legacy `appointments` rows.

**Changes**

- `src/hooks/useDoctorPerformance.ts` (or the existing aggregator behind `DoctorPerformanceSection`)
  - Join `appointment_sessions` (or whatever the session table is called — confirm via `supabase--read_query` during implementation) onto `appointments` and count sessions with `status IN ('in_progress','completed')` in addition to `appointments.status = 'completed'`.
  - Use the session `started_at`/`ended_at` for duration metrics when available; fall back to appointment slot length.

- `src/hooks/useDoctorFinancialStats.ts` (or equivalent feeding `DoctorFinancialStatsSection`)
  - Include revenue lines whose source is a session (e.g. `appointment_sessions.fee_amount` or `payments.appointment_session_id`). Sum alongside current appointment-based revenue, de-duped by appointment id so we never double-count.
  - Reflect session counts in the "appointments" series in `earningsHistory` exports.

- No UI changes required — the existing charts/cards re-render off the broadened hook output.

---

## Technical notes

- Schema verification needed before coding: `appointments.referral_id` column existence, `referral_appointments` table shape, `appointment_sessions` table name + columns, payment linkage table. Will run targeted `supabase--read_query` calls at the start of implementation.
- Security: the new admin link endpoint must validate the caller is staff of `receiver_entity_id` (use existing `has_role`/staff-context helpers). No service-role key leaves the edge function.
- i18n: any new strings use existing namespaces (`doctor`, `prescriptions`, `referrals`).
- Out of scope: redesigning analytics UI, notifications on referral booking (already handled by `referral-notify`), changes to imaging/lab referral flow.
