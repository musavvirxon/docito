# Connect the diagnosis library to the appointment session + multi-tooth selection

## What's wrong today

The Diagnoses section of the doctor dashboard saves entries into the doctor's diagnosis library (stored in `procedure_templates`, loaded by the dashboard's doctor-data provider).

The tooth diagnosis picker inside an appointment session tries to read that same library from the dashboard provider — but the appointment session page is not wrapped by that provider, so the read always fails and the dropdown falls back to "Your diagnosis library is empty", even when the doctor has diagnoses saved.

## Changes

### 1. Load the library independently of the dashboard

- Add a small hook (`useDiagnosisLibrary`) that fetches the signed-in doctor's diagnoses directly (by doctor id, active entries, ordered by name) and can add a new one, with a realtime refresh so newly added entries appear instantly.
- Use it in the tooth diagnosis picker instead of the dashboard provider. Result: whatever appears under Diagnoses in the doctor dashboard appears in the session dropdown, and "Add new diagnosis" from the session saves back into the same library.
- Keep the empty-state message only for genuinely empty libraries, and show a loading state while fetching.

### 2. Multi-tooth selection in the diagnosis tooth chart

- Keep FDI numbering and the permanent/primary toggle, and make multi-select explicit and faster:
  - Click toggles a tooth; click-and-drag across teeth selects a range.
  - Per-quadrant "select all / clear" toggles, plus "Select all" and "Clear" for the whole chart.
  - Selected teeth shown as removable chips under the chart with a live count.
- Saving applies the chosen diagnosis to every selected tooth in one action (already the behaviour) and the confirmation reports the number of teeth.

### 3. Polish

- Add the new i18n keys (EN, RU, UZ) for the loading state, quadrant/select-all controls, and chip removal labels.
- Chart controls stay in the existing card styling; no schema changes.

## Technical notes

- Files touched: new `src/hooks/useDiagnosisLibrary.ts`; `src/components/appointments/ToothDiagnosisPicker.tsx`; `src/components/dental/ToothSelector.tsx`; locale `appointments.json` for en/ru/uz.
- No database migration; the library continues to use the existing doctor-scoped table and RLS.
