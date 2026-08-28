# Show full patient profile in the appointment patient dialog

## Current behavior

The patient dialog opened from an appointment card (`src/components/doctor/UpcomingAppointmentCard.tsx`) renders its own hand-rolled tabs (Overview / Medications / limited extras) fed by a small ad-hoc fetch. That is why it shows only a name plus "No medications found" while the real patient profile page shows much more.

The app already has a complete profile component, `PatientProfileView` (`src/components/appointments/PatientProfileView.tsx`), used by `/doctor/patients/:patientId` (`src/pages/doctor/DoctorPatientProfile.tsx`). It supports both `registered` and `direct` (manually added) patients and includes contact info, demographics, allergies/history, appointments, prescriptions, lab and imaging results, and an entity history panel.

## Change

Replace the custom dialog body in `UpcomingAppointmentCard.tsx` with `PatientProfileView`, so the dialog shows exactly what the patient profile page shows.

- Determine `patientId` + `patientType` from the appointment: `patient_id` -> `registered`, otherwise `doctor_patient_id` -> `direct`.
- Render `<PatientProfileView patientId={...} patientType={...} compact />` inside the existing dialog (wide, scrollable content).
- Keep the current dialog behavior: appointment dialog closes before the patient dialog opens and reopens when the patient dialog closes; a toast still appears when the appointment has no linked patient record.
- Remove the now-unused local patient fetch/state and tab markup from `UpcomingAppointmentCard.tsx`.

## Technical notes

Single file changed: `src/components/doctor/UpcomingAppointmentCard.tsx`. No schema, RLS, or data changes; `PatientProfileView` already handles its own loading, empty states, and i18n.
