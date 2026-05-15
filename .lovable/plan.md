## Goal

Make it easy to convert a referral into a real appointment:

- **Doctor / receiving entity** gets a "Book appointment" button on each referral row (where the patient is known), which opens the existing appointment creation flow pre-filled with the referred patient and referral context.
- **Patient** already sees their referrals in `/patient-dashboard → Referrals` and can book via `ReferralCard`. We confirm the path is discoverable and the booking flow carries `referralId` end-to-end.

## Changes

### 1. `src/components/doctor/DoctorReferralsSection.tsx` (referral row)
- Add a new **"Book"** button (calendar icon) in the actions group at lines 285–339, shown when:
  - `role === 'receiver'` AND
  - `status` ∈ `accepted | sent | slots_available | booked` (not completed/rejected/expired) AND
  - referral has a resolvable patient (`patient_id` OR `doctor_patient_id` OR `facility_patient_id`).
- On click, open the existing doctor appointment creation modal (the same one used in `DoctorCalendarSection` / "New appointment") pre-filled with:
  - patient (from referral),
  - referral id (stored on the appointment as `referral_id` if column exists; otherwise passed as metadata so it can be linked back),
  - reason / notes from referral.
- If the referral was sent to the doctor by a clinic/lab/etc. and the doctor accepts, this becomes the primary CTA.
- Mirror the same button (same logic) inside `ReferralDetailsDialog` footer for discoverability.

### 2. `src/components/referrals/ReferralCard.tsx` (entity-side)
- Same "Book" button for `role === 'receiver'` so non-doctor dashboards using `ReferralsSection` (clinic/lab/imaging) also get the action. It calls a new optional prop `onBookAppointment?(referral)` so each host dashboard wires it to its own scheduling modal.

### 3. Patient side — already mostly wired
- `PatientReferralsSection` → `ReferralsSection role="patient"` → `ReferralCard` already shows:
  - "Book appointment" when referral targets a specific doctor,
  - "Choose provider" when general.
- Confirm `/patient-dashboard?section=referrals&referral=<id>` deep link works (already implemented in `PatientDashboard.tsx`).
- Add a small "Book" shortcut on the patient's appointments empty-state / notifications when a new referral arrives (out of scope for this pass — note only).

### 4. Linking appointment ↔ referral
- Reuse existing `appointments.referral_id` column if present; if not, the booking modal stores `{ referralId }` in appointment notes/metadata and we follow up with a migration in a separate task. **No DB migration in this pass** unless verification shows the column is missing — will check during implementation.
- After successful booking, optimistically refetch referrals so status badge flips to `booked`.

## Out of scope
- New scheduling UI — we reuse the existing doctor "New Appointment" modal.
- Cross-entity (clinic/lab) wiring beyond exposing the prop on `ReferralCard`.
- Notifications/emails on booking from referral.

## Technical notes
- Prop signature: `onBookAppointment?: (referral: Referral) => void` added to `ReferralCard` and used inside `DoctorReferralsSection`'s row component.
- Patient resolution helper: small util `resolveReferralPatient(referral)` returning `{ id, name, kind: 'patient' | 'doctor_patient' | 'facility_patient' }` so the booking modal can accept the right id type.
- Verify `appointments` schema for `referral_id` column before storing it; otherwise pass via modal-local state only.
