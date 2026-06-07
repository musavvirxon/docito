## Goal

On the Doctor Dashboard, remove the profile-completion alert/progress bar at the top and replace it with a single prominent CTA: **"New Patient · New Appointment"**. Clicking it opens a 2-step flow that reuses existing components (no new forms, no new pages).

## Files touched

1. `src/pages/DoctorDashboard.tsx` — remove completion card, render new CTA + stepper container.
2. `src/components/doctor/NewPatientAppointmentFlow.tsx` *(new — orchestration only, no form/UI of its own)* — wraps the existing modals and routes between steps.

The new file is just glue: it imports and renders existing components in sequence. No duplicated form fields, no new styling beyond the standard `Dialog` shell already used everywhere.

## Behavior

### Replace top card
Remove the entire `{isProfileIncomplete && (...)}` block in `DoctorDashboard.tsx` (lines ~235–265) and the now-unused `profileCompletion` / `isProfileIncomplete` locals + `Progress` import.

In its place, render a single dashboard-styled card containing one primary `Button` (default variant, `size="lg"`, with `UserPlus` + `Calendar` icons) labeled **"New Patient · New Appointment"**. Style matches the existing stats cards above (same `Card` shell, gradient accent, same button look used elsewhere on the dashboard).

### Stepper flow (orchestrator component)

State machine inside `NewPatientAppointmentFlow`:

```text
idle → step1_patient → choose_mode → step2_schedule | step2_start_now → done
```

- **Step 1 — Patient**: render the existing `AddPatientModal` (`src/components/doctor/patients/AddPatientModal.tsx`). Its `onSuccess(patientId)` advances the flow and stores the new `patientId`.

- **Choose mode**: a tiny intermediate `Dialog` with two buttons — "Schedule for later" and "Start right now". No new form fields.

- **Step 2a — Schedule for later**: render the existing `ManualBookAppointmentModal` with `doctorId`, `practiceId`, and `preselectedPatient={{ id: patientId, ... }}` pre-filled so the doctor only picks date/time. Its `onSuccess` closes the flow.

- **Step 2b — Start right now**: open `ManualBookAppointmentModal` with `prefilledDate={new Date()}`, `prefilledTime` = current rounded time, and `forceAppointmentType="in_person"`, so the doctor confirms the immediate slot in one click. In its `onSuccess(appointmentId)`, `navigate(`/appointment-session/${appointmentId}`)` — the existing session page (`src/pages/AppointmentSession.tsx`, route already wired in `src/App.tsx` line 282/385).

Using `ManualBookAppointmentModal` for both branches keeps all booking validation, conflict checks, and DB inserts in one already-tested path.

## Technical notes

- No DB changes, no new edge functions, no schema work.
- `AddPatientModal.onSuccess` already returns `patientId` (line 229).
- `ManualBookAppointmentModal` already accepts `preselectedPatient`, `prefilledDate`, `prefilledTime`, `forceAppointmentType`, and emits `onSuccess(appointmentId)`.
- Session route `/appointment-session/:appointmentId` is already registered.
- The flow component only owns a `step` state and the captured `patientId`; everything else is delegated.
- Remove `Progress` import and `profileCompletion`/`isProfileIncomplete` to keep the file clean. `useDoctorProfile` still exposes them for other consumers — no changes to the hook.
- Button label is literal and untranslated per request ("New Patient · New Appointment"); matches the user's wording.

## Out of scope

- No edits to `AddPatientModal`, `ManualBookAppointmentModal`, `AppointmentSession`, or `useDoctorProfile`.
- No changes to other dashboard sections, routing, or i18n files.
