## Goals
Fix the procedure enum crash, group procedures by category in appointment sessions, make sure doctors can add patients + procedures + payments anywhere, support per-procedure currency override, and fix invisible button text in light ("day") mode for clinic admin sub-sections and patient buttons.

## 1. Drop `procedure_category` enum (root cause of `"kffssdf"` crash)

Migration:
- `ALTER TABLE public.procedures ALTER COLUMN category TYPE text USING category::text;`
- Same for any other column typed as `procedure_category` (check `procedures.category` default → set default `'general'`).
- `DROP TYPE public.procedure_category;` after columns are migrated. Triggers/RPCs that cast `'general_consultation'::procedure_category` are rewritten to plain text.
- Keep `DEFAULT_PROCEDURE_CATEGORIES` in `src/lib/procedureCategories.ts` as the suggestion list; custom values are saved verbatim (already normalized via `normalizeProcedureCategory`).

Code:
- Remove `as any` casts and the `category: 'general' | 'preventive' | …` union in `src/components/doctor/AddServiceModal.tsx` and `src/hooks/useDoctorServices.ts` — switch to `string`, render full options from `mergeCategories(DEFAULT_PROCEDURE_CATEGORIES, dbCustomValues)` so doctors see existing custom categories too.
- Replace the hard-coded 8-value list in `AddServiceModal` with the same `mergeCategories` source already used by `EnhancedProcedureForm`/`AddProcedureModal`, plus a "Custom…" option that writes free text.

## 2. Add patient to any procedure (registered or manual)

Currently `AddProcedureModal` (appointment-session variant) assumes an appointment-bound patient.
- Add an optional `patientId | manualPatient` selector in `AddProcedureModal` (used outside of session) so a doctor can pick a registered patient via `PatientPicker`, or expand `CreatePatientModal` inline for a manual entry (writes to `facility_patients` / `doctor_patients`).
- `useAppointmentProcedures.addProcedure` already accepts `appointment_id`; extend it to also accept `patient_id` so out-of-session procedures still attach to a patient.
- Tooth-based vs general: keep current `isDentist` switch; teeth selector is optional regardless.

## 3. Procedure history grouped by category in appointment session

In `AppointmentProceduresPanel`:
- Group current appointment's procedures by `category` (use `getProcedureCategoryLabel`).
- Render a sticky top row of category chips (count badge each); clicking a chip scrolls/filters to that section.
- Each section: list of procedure rows with status, tooth refs, cost+currency, edit/delete.
- Empty categories hidden. Order: most-used categories first, then alphabetic.

## 4. Payments — doctors can record everywhere

Reverse earlier removal. Audit and re-enable:
- `AppointmentFinancePanel`: keep the "Record payment" dialog; ensure doctor role is allowed in the gate.
- Add a "Record payment" action to:
  - Doctor dashboard finance section (already has `IncomeEntriesPanel`; add explicit "Record payment" button writing to `payments` with `recorded_by = doctor user`).
  - Appointment quick-preview popup (`AppointmentQuickPreview.tsx`) — small "Add payment" button opening the same dialog.
- RLS: confirm `payments` INSERT policy permits doctors who own the appointment (or are the practice's doctor). If not, add a policy `doctors can insert payments for their appointments` keyed via `has_role`/doctor-of-appointment helper.
- Payment dialog: currency field defaults to entity currency, but doctor can switch (drives storage in that currency; `useEntityMoney` converts for display).

## 5. Per-procedure currency override

- Add `currency text` column to `appointment_procedures` and `procedures` (default null → falls back to doctor/practice base currency).
- `AddProcedureModal` + `EnhancedProcedureForm` + `AppointmentProceduresPanel.AddProcedureModal`: add a currency `<Select>` next to the cost input, sourced from `supported_currencies`. Default = doctor/practice currency.
- Display: use `useEntityMoney(procedure.currency ?? entity.currency)` so the viewer's selected currency is what they see while DB keeps the original.
- Finance trigger (`trg_session_to_finance_entry`): write `finance_entries.currency` = procedure.currency override when present.

## 6. Light-mode button text visibility (clinic admin sub-sections + patient buttons)

Cause: buttons use hard-coded `text-white` / `text-primary-foreground` on `bg-background` or `variant="outline"` in light theme — invisible.
- Sweep `src/components/dashboard/admin/**` and `src/components/doctor/patients/**` for `text-white`, `text-black`, `bg-white text-white`, replace with semantic `text-foreground` / appropriate variant.
- Verify by running the preview in light mode at `/clinic-admin` sub-sections and the patient list.

## Technical details

```text
procedure_category (enum)  ─► text column + suggestion list
                                │
                                ▼
AddServiceModal / AddProcedureModal / EnhancedProcedureForm
  ├─ category: string (free text + suggestions)
  └─ currency: string (override, falls back to entity base)

appointment_procedures
  + currency text NULL
  + patient_id uuid NULL  (already? if not, add)

Session UI:
  Category Chips [General • Restorative • Surgical …]
       │
       ▼
  Sections grouped by category → procedure rows

Payments:
  Doctor → Record Payment available in:
    Session Finance Panel · Doctor Dashboard · Appointment Quick Preview
  RLS: payments.insert allowed for doctor-of-appointment
```

## Files to touch
- `supabase/migrations/<new>.sql` — enum→text, currency column, RLS for payments.insert, dropping enum type.
- `src/lib/procedureCategories.ts` — already supports free text; no change needed.
- `src/components/doctor/AddServiceModal.tsx` — free-text categories, currency select.
- `src/components/procedure/AddProcedureModal.tsx`, `EnhancedProcedureForm.tsx` — currency select, patient picker (out-of-session).
- `src/components/appointments/AddProcedureModal.tsx` — currency select.
- `src/components/appointments/AppointmentProceduresPanel.tsx` — category grouping + chip nav.
- `src/components/appointments/AppointmentFinancePanel.tsx` — re-enable record payment for doctors, currency override.
- `src/components/doctor/calendar/AppointmentQuickPreview.tsx` — add "Add payment" button.
- `src/hooks/useDoctorServices.ts`, `src/hooks/useAppointmentProcedures.ts` — types loosened to `string`, currency field.
- `src/components/dashboard/admin/**`, `src/components/doctor/patients/**` — replace hard-coded text colors with semantic tokens.

## Out of scope
- Payment provider integration (Stripe/Paddle) — payments here are manually recorded entries, not online checkout.
- Multi-currency invoicing rewrite (kept as previous turn).
