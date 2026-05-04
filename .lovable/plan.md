I found the Appointment Session page does contain code for Treatment Plan and Prescription tabs, but there are several blockers that can make them effectively invisible or unusable:

1. The new tabs are gated behind `canManagePrescriptions`, which is currently based on `allRoles.includes('patient')`. If the logged-in user has both doctor and patient roles, the tabs are hidden even while they are acting as a doctor.
2. The current route is loaded as an anonymous browser session in the debug preview, so the appointment query returns no appointment data. The app then stays on the loading/empty state and no tabs can be seen.
3. Treatment plan creation is passing only a patient ID to the dashboard modal. For doctor-added patients, that ID is incorrectly treated as a registered `patient_id`, so plans may not be saved under the correct patient linkage.
4. Prescription creation currently does not pass or persist `appointment_id`, so prescriptions made during an appointment are patient-level, not appointment-scoped.
5. The Notes tab no longer has the finance panel, but there is still a duplicate finance panel inside the Session tab; I will ensure the Notes area stays notes-only.

Plan:

1. Fix tab visibility and navigation
   - Update `AppointmentSession.tsx` to use the active role / appointment doctor context instead of hiding tabs whenever `allRoles` contains `patient`.
   - Treatment Plan and Prescription tabs will be visible as separate tabs for the doctor/staff appointment workspace.
   - Keep dental-only gating only for the Dental tab.
   - Make the tab bar layout robust with flex wrapping and explicit visible trigger styles.

2. Make appointment tab URLs reliable
   - Ensure `?tab=treatmentPlan` and `?tab=prescriptions` open their matching sections directly.
   - If a user lands on a tab that is not available for their role/context, redirect to the nearest valid tab instead of silently showing no content.

3. Scope Treatment Plans to this appointment’s patient
   - Update `AppointmentTreatmentPlansSection` so it receives `appointmentId` and exact patient linkage.
   - For registered patients, use `patient_id`.
   - For doctor-added patients, use `doctor_patient_id`.
   - Filter treatment plans to the appointment’s patient only, not all patients.
   - Pass the correct preselected patient identity into the create-treatment-plan modal, and update the modal if needed so doctor-added patients are not accidentally saved as registered patients.
   - Reuse the same treatment plan detail/create backend data and UI used by the doctor dashboard.

4. Scope Prescriptions to this appointment
   - Update `PrescriptionCreator` / `usePrescriptions` to accept `appointmentId`.
   - Update the `create_prescription` RPC with an optional `p_appointment_id` argument and insert it into `prescriptions.appointment_id`.
   - In Appointment Session, pass the current appointment ID so new prescriptions apply only to the patient in the current appointment.
   - Optionally show an appointment-scoped prescription list in that tab after creation so the doctor can see what was created for this visit.

5. Keep Notes clean
   - Confirm the Notes tab only contains the session note editor.
   - Remove any remaining patient finance block from the Notes section if present.

6. Align completed procedure billing
   - Keep procedure creation as completed-only.
   - Ensure only completed procedures count toward the appointment procedure total and billing charge.
   - Ensure charge rows are tied to the created procedure and appointment so patient financial totals update correctly and can be cleaned up if the procedure is removed.

7. Validate after implementation
   - Check the appointment page at a desktop viewport.
   - Verify visible separate tabs: Session, Video when relevant, Diagnoses, Dental for dentists, Treatment Plan, Prescriptions, Notes.
   - Verify direct navigation to `?tab=treatmentPlan` and `?tab=prescriptions` works.
   - Verify Notes does not show Patient Finance.
   - Verify treatment plans and prescriptions save with the appointment patient/appointment context.