# Fix "View Patient Details" card in appointment details

## What happens now

Inside the appointment details dialog, the patient card calls `handlePatientClick`, which does nothing at all unless `selectedAppointment.patient_id` exists (`src/components/doctor/UpcomingAppointmentCard.tsx:305-310`). For manually added patients (identified by `doctor_patient_id`, not `patient_id`) the click is a silent no-op.

Two further weaknesses in the same path:
- The patient dialog is opened while the appointment dialog is still open, so it stacks a second Radix dialog on top of the first.
- `fetchPatientDetails` uses `.single()` on `profiles`; if the row is unreadable it throws, is swallowed by the catch, and the dialog opens empty with no message.

## Changes

1. **Make the click always do something** — in `handlePatientClick`:
   - Registered patient (`patient_id`): keep current behavior.
   - Manual patient (`doctor_patient_id` and no `patient_id`): load the record from `doctor_patients` and show it in the same dialog (name, contact, DOB/gender, address, medical history, allergies, medications, emergency contact), with clinical tabs that don't apply hidden.
   - Neither present: show a short toast explaining no linked patient record exists, instead of doing nothing.
2. **Close the appointment dialog before opening the patient dialog** so only one dialog is mounted at a time; closing the patient dialog returns to the appointment dialog.
3. **Handle load failures** — swap `.single()` for `.maybeSingle()` and, when no profile is readable, fall back to the name/phone/email already on the appointment plus an inline "limited details available" note rather than a blank dialog.

## Technical notes

All work is inside `src/components/doctor/UpcomingAppointmentCard.tsx`. No schema or RLS changes. New user-facing strings use `useTranslation('dashboard')` with EN/RU/UZ keys under `doctor.patientDetails.*`, matching the existing keys in that file.
