# Finish appointment + guest video links + patient identity merge

Three coordinated changes to the appointment session workspace.

## 1. "Finish Appointment" button

Add a primary button in the session header (next to "End Session") that always marks `appointments.status = 'completed'` and stamps `completed_at`, regardless of whether a session row exists. Useful for video / quick visits where the doctor never opens the session shell.

- Reuses the existing follow-up gate before completing.
- If a session is open, also closes it (`session_status = 'completed'`).
- Navigates back to the calendar with a success toast.

## 2. Live video for unregistered (manually-added) patients

Today `startOrJoinVideo` refuses to run unless `appointment.patient_id` is set. Change:

- Schema (`video_consultations`):
  - `patient_id` → nullable
  - add `doctor_patient_id uuid` (FK to `doctor_patients`)
  - add `guest_token text unique` (random, 32 chars)
  - add CHECK constraint: exactly one of `patient_id` / `doctor_patient_id` is set
- `useVideoConsultation.createConsultation` accepts either id and a generated `guest_token`.
- Session header shows a "Copy patient link" button when the appointment patient is a `doctor_patient`. Link format: `https://<app>/v/<guest_token>`.
- `livekit-token` edge function: allow joining when the caller presents a valid `guest_token` (no auth required) — issues a participant token scoped to that consultation only.

## 3. Guest join page + identity merge on claim

New route `/v/:token` (public, in `PublicLayout`):

- Fetches consultation summary via new RPC `get_consultation_by_guest_token(token)` returning doctor name, scheduled time, and whether the visitor is signed in.
- If **not signed in**: shows two CTAs — "Join as guest" (enters the LiveKit room using the guest token) and "Sign in / Sign up to claim your record" (routes through normal auth, then returns here).
- If **signed in**: calls edge function `claim-doctor-patient` which:
  1. Verifies the `guest_token` matches a `video_consultations` row whose `doctor_patient_id` is set.
  2. Looks up / creates the user's `profiles` row.
  3. Merges: copies non-conflicting `doctor_patients` fields (DOB, allergies, history, etc.) into the patient's profile and any patient-side record, then re-points every reference from the `doctor_patient_id` to the new `patient_id`:
     - `appointments.doctor_patient_id → patient_id`
     - `appointment_sessions`, `video_consultations`, `treatment_plans`, `prescriptions`, `referrals`, `appointment_dental_procedures`, conversations, attachments
  4. Marks the original `doctor_patients` row as `merged_into_user_id = <uuid>` and `status = 'merged'` (kept for audit, hidden from active lists).
  5. Returns the consolidated patient context, then the page joins the LiveKit room with a normal auth-issued token.

Idempotent: re-claiming the same token after merge is a no-op.

## Technical details

- Migration sets defaults and a backfill so existing rows pass the new CHECK.
- Merge logic lives in a single SECURITY DEFINER RPC `claim_doctor_patient(guest_token text)` invoked by the edge function with the user's JWT; RPC re-validates `auth.uid()` and token before touching data.
- `useDoctorPatientsV2` filters out rows where `status = 'merged'`.
- Audit row added in a new `patient_merge_log` table (`doctor_patient_id`, `claimed_by_user_id`, `claimed_at`).
- Header "Copy patient link" copies the URL and toasts; reuses existing toast system.
- All new UI strings go through `useTranslation`.

## Files touched

- `supabase/migrations/<new>` — schema + RPC + log table + RLS
- `supabase/functions/livekit-token/index.ts` — guest-token branch
- `supabase/functions/claim-doctor-patient/index.ts` — new
- `src/hooks/useVideoConsultation.ts` — accept doctor_patient_id + guest_token
- `src/pages/AppointmentSession.tsx` — Finish button, guest link UI, allow video for unregistered
- `src/pages/GuestVideoJoin.tsx` — new public page
- `src/App.tsx` — route registration
- `src/hooks/useDoctorPatientsV2.ts` — filter merged
