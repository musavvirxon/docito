## Goals

1. Fix layout overlaps in the **043/u summary PDF**.
2. Populate the PDF with **real patient + doctor data** (registered or manually-added patients).
3. Add the missing patient field (`profession`) so the 043 form can show it; expose it in the manual add + edit patient forms (optional).
4. Refactor the **Dental tab** so procedure adding lives **inline (big section)** in the page — pick procedure → pick teeth → save → user is billed automatically (cost × tooth count).
5. Verify the **other-doctor public profile** shows a clean **Procedures** section (no dental chart).
6. Confirm the **Prescriptions** section appears in the appointment-session tabs immediately before Notes (it already is — we'll harden it and make it always visible to the doctor).

---

## 1. Fix 043/u Summary PDF (`src/utils/generateAppointmentPdf.ts`)

Problems found while reading the generator:
- Tooth-chart top labels (`Yuqori` / `Quyi`) are written using `y - 12` / `y - 6` after the bottom-numbers row, which overlaps the rows themselves.
- The midline `ln(... y-4 ... y + ch*2 + 4 ...)` extends above and below the chart cleanly, but the upper/lower direction labels (`← Правая`, `Левая →`) use the same `y` as the FDI numbers and only advance `y += 3` — text overlaps the number row.
- Section title `secTitle` then `emptyLn` writes underline lines with no inter-line padding, occasionally landing over diagnosis text on long inputs.
- Footnote and bite line are emitted without `ensureSpace`, so they overlap the chart on short pages.

Fixes:
- Rebuild the chart block with explicit `chartTop`/`upperY`/`lowerY`/`chartBottom` math; draw `Yuqori`/`Quyi` row labels at `upperY + ch/2 + 1.5` and `lowerY + ch/2 + 1.5` (left of cells), using right-align.
- Move `← Правая / Левая →` direction labels above the FDI numbers with a dedicated `+= 4` gap.
- Increase `LH`/`SLH` slightly for the patient box; drop `font-bold` patient name to a separate row to stop column overflow.
- Add `addPageIfNeeded(h)` helper used before chart, footnote, finance table, signatures.
- Lower `font-size 6.5` in legend to size 7 with tighter line spacing using `splitTextToSize`, so it never collides with the chart.
- Stamp tooth codes inside cells using `slice(0, 3)` instead of 4 to prevent text bleeding beyond cell width.
- Shift signature block down (`y += 18`) and use a guaranteed page break if `y > 245`.

## 2. Populate PDF with real data

Currently `AppointmentSession.tsx > fetchSessionData` only selects `full_name, phone, email, avatar_url` from `profiles` and `doctor_patients`. Extend the SELECT and the `setAppointment` mapping to include:

- Registered patient (`profiles`): `date_of_birth`, `gender`, `address`.
- Manual patient (`doctor_patients`): `date_of_birth`, `gender`, `address`, `profession` (new), `medical_history`, `allergies`.

Compute `age` from `date_of_birth` (years).

Pass to `generateAppointmentPdf` (in the `downloadSummary` handler) the full set:
`gender, age, dob, address, profession, complaints` (use patient `medical_history`/`allergies` for the Complaints / Past-diseases sections, falling back to empty lines).

## 3. Add `profession` field

DB migration:
- `ALTER TABLE public.doctor_patients ADD COLUMN IF NOT EXISTS profession text;`
- `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profession text;`
- Both nullable / optional.

UI updates (optional input):
- `src/components/doctor/patients/AddPatientModal.tsx` — add `profession` to `patientSchema`, formData, insert payload, and a new input next to address.
- `src/components/patient-dashboard/EditPatientModal.tsx` — add `profession` to schema, default value, both update branches (`doctor_patients` and `profiles`), and a new input on the Personal tab.
- `src/components/patient/EditProfileForm.tsx` (or equivalent registered-patient profile editor) — add the same optional field.

## 4. Dental tab refactor (inline procedure adding + auto billing)

Behaviour requested:
- Big inline section on the Dental tab (no modal-only flow).
- Dentist picks procedure (from their service catalogue or custom) + selects teeth.
- Saving the procedure inserts a row in `tooth_procedure_history` AND creates a corresponding `billing_transactions` row so the Finance panel reflects the charge.
- Cost = `unit_cost × selected teeth count`. If 0 teeth, single-unit cost.

Implementation:

A. New component `src/components/appointments/DentalProcedurePicker.tsx`:
- Inline card with: service `<Select>` (uses `useDoctorServices`), Custom name `<Input>`, Cost (auto-filled, editable), Status, Notes, and an embedded `ToothSelector` (FDI grid) that also accepts clicks bubbling up from the chart's selection state via prop.
- Computed total: `unitCost × teeth.length` shown live.
- `Save Procedure` button → calls `addProcedure` from `useAppointmentProcedures`.

B. `src/components/appointments/AppointmentProceduresPanel.tsx`:
- Remove `<AddProcedureModal>` use; show the new `DentalProcedurePicker` inline at the top of the card. List below remains.
- Keep `Refresh`. Drop `Add Procedure` button.

C. `src/hooks/useAppointmentProcedures.ts > addProcedure`:
- Compute `totalCost = unitCost * Math.max(teeth.length, 1)` if caller passes `unitCost`.
- After successful insert into `tooth_procedure_history` (or `appointment_procedures`), insert a billing row:
  ```ts
  await supabase.from('billing_transactions').insert({
    appointment_id, entity_type: 'doctor', entity_id: doctorId,
    transaction_type: 'charge', status: 'pending',
    amount: Math.round(totalCost),                // legacy units
    amount_cents: Math.round(totalCost * 100),
    currency: 'USD',
    description: `${name}${teeth.length ? ` (Teeth ${teeth.join(',')})` : ''}`,
  });
  ```
- On `removeProcedure`, also delete the matching billing row by appointment + description match (or store FK in metadata).

D. `src/pages/AppointmentSession.tsx > Dental TabsContent`:
- Layout becomes:  
  1. `EnhancedDentalChart` (read-only/select-only, used to pre-pick teeth)  
  2. `AppointmentProceduresPanel` (now inline, large)  
  3. Existing read-only history card (kept).
- Remove the duplicate inner `ProcedureModal` invocation in `EnhancedDentalChart` to avoid two flows; expose `selectedTeeth` upward via the existing `onToothSelect` prop and feed it to the picker (`initialTeeth`).

E. Patch `useDentalChart.addProcedureToTeeth` similarly so chart-driven inserts also create the billing row (single source of truth: a small helper `createProcedureBilling()` shared by both hooks).

## 5. Other-doctor public profile

`src/pages/doctor/DoctorPublicProfile.tsx` currently lists procedures only as plain names inside `AboutSection`. Add a new lazy section `<ProceduresSection procedures={procedures} currency=... />`:
- Card grid; each card shows name, category badge, duration, formatted cost, optional description.
- Mounted between `AboutSection` and `ClinicAffiliationsSection`.
- Empty-state when none (per data-integrity rule).
- No dental chart anywhere on this page (already absent — verified).

New file: `src/components/doctor/public/ProceduresSection.tsx`.

## 6. Prescriptions section in appointment session

Already wired as a tab between Dental and Notes (tab order: session, video, diagnoses, dental, **prescriptions**, notes). Adjustments:
- Confirm the `canManagePrescriptions` gate doesn't hide it for the doctor of the appointment; remove gate for the assigned doctor.
- Wrap `<PrescriptionCreator>` in a Card with a clear header "Prescriptions" and a list of prescriptions already created for this appointment (read from `prescriptions` table filtered by `appointment_id`), each row with download button.
- No DB changes.

## Technical details

**Files to add**
- `src/components/appointments/DentalProcedurePicker.tsx`
- `src/components/doctor/public/ProceduresSection.tsx`
- One migration: `add_profession_to_patient_tables.sql`

**Files to edit**
- `src/utils/generateAppointmentPdf.ts` — layout fixes, smaller stamp text, page-break helpers.
- `src/pages/AppointmentSession.tsx` — extended SELECT, age calc, full PDF data payload, dental tab restructure, prescriptions card wrapper.
- `src/components/appointments/AppointmentProceduresPanel.tsx` — replace modal with inline picker.
- `src/hooks/useAppointmentProcedures.ts` — auto-billing insert/delete.
- `src/hooks/useDentalChart.ts` — share auto-billing helper.
- `src/components/doctor/patients/AddPatientModal.tsx` — add `profession`.
- `src/components/patient-dashboard/EditPatientModal.tsx` — add `profession`.
- `src/pages/doctor/DoctorPublicProfile.tsx` — mount `ProceduresSection`.
- (Possibly) `src/components/dental/EnhancedDentalChart.tsx` — drop unused inner ProcedureModal trigger when used inside session (controlled by a new prop `disableInternalProcedureModal`).

**QA**
- Generate Russian + Uzbek 043 PDFs; convert pages to images; verify no overlaps and that patient name/dob/gender/address/profession + doctor + clinic appear.
- Add a procedure with 2 teeth at $50 → Finance "Billed" jumps by $100; remove → drops back.
- Open `/doctor/<slug>` → Procedures section appears with prices, no dental chart.
- Open appointment session → "Prescriptions" tab visible directly before Notes; creating one persists and lists below.
