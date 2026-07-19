
## Goal

Four connected fixes on the appointment session workspace:

1. Complete EN/RU/UZ i18n across every tab and its backend messages
2. Auto-generate a bill line item each time a procedure is added, and net it against recorded payments
3. Surface any unpaid balance on the patient profile
4. Persist diagnoses (general + per-tooth) and feed them into the 043 clinical form document

---

## 1. i18n — EN / RU / UZ

Sweep every tab in `AppointmentSession` and its side panels for hardcoded strings, replace with `t(...)` keys, and add matching entries to `public/locales/{en,ru,uz}/dashboard.json` (plus `prescriptions.json`, `finance.json`, `diagnosis` block already scaffolded).

Sections to audit (I'll grep for literal strings in each before editing):

- Prescriptions tab — `DoctorPrescriptionCreator` (currently the visible screen: "Create Prescription", "Use a template", "Save as template", "Medication N", field labels, "Add Another Medication", "Number of Refills", "Additional Notes", "Create Prescription", frequency + unit dropdowns).
- Procedures tab — `AppointmentProceduresPanel`, category headers, "Add Service/Procedure" modal, currency override labels.
- Diagnosis tab — add/edit modal, empty state, tooth-scoped labels.
- Files / Notes / Treatment Plan / Video tabs — remaining literals.
- Finance/Billing panel — line-item labels, "Outstanding", "Prior balance", "Mark fully paid", payment method options, toast strings.
- Toasts and error strings from hooks: `useAppointmentFinance`, `useRecordPayment`, `useAppointmentProcedures`, `useAppointmentDiagnoses`.

Rule: every user-visible string, including `toast.success/error` and empty-state copy, goes through `t()`. Keys land under `dashboard.appointmentSession.<tab>.*` where they don't already exist, and are mirrored across `en`, `ru`, `uz`. Other locales stay as-is (English fallback) — user only asked for these three.

---

## 2. Auto-billing when a procedure is added

Current state: `appointment_procedures` insert doesn't write to `billing_transactions`, so the Finance panel shows $0 billed until someone manually enters a charge.

Change: add a Postgres trigger `trg_ap_autobill` on `appointment_procedures` that on `INSERT` (and on `UPDATE` of `price`/`quantity`/`currency`/`discount`) upserts a matching `billing_transactions` row keyed by `appointment_procedure_id`.

- Charge amount = `quantity * unit_price - discount`, stored in `amount_cents` and `amount` with the procedure's `currency`.
- `transaction_type = 'charge'`, `status = 'pending'`, `description` = procedure name, `appointment_id`, `patient_id`, `doctor_id`, `practice_id` copied from the appointment.
- On `DELETE` of the procedure → delete/void the linked transaction.
- Add `appointment_procedure_id uuid` column to `billing_transactions` (unique, nullable) as the idempotency key.

Payment netting: `useAppointmentFinance` already computes `outstanding = totalBilled − totalDiscounts − totalPaid`. Once charges exist, this becomes correct automatically. Verify the same math in `useRecordPayment` so `paymentStatus` (`paid` vs `partial`) reflects the appointment's remaining balance, not just the single line.

Realtime: extend the existing `appointment_procedures` subscription in the finance panel to also refetch on `billing_transactions` and `payments` changes for the appointment.

---

## 3. Outstanding balance on patient profile

Add a database view `patient_outstanding_balance_v` (security_invoker):

```
select patient_id,
       sum(charges) - sum(discounts) - sum(payments) as outstanding_cents,
       currency
from ... group by patient_id, currency
```

Frontend:

- New hook `usePatientOutstanding(patientId)` reading that view.
- Patient profile header (in `DoctorPatientProfile` / `PatientOverviewCard`) shows a badge: "Outstanding: {amount} {currency}" when `> 0`, muted "Paid up" when `0`. Uses `useCurrency` for display conversion. Localized via `dashboard.patient.outstanding.*`.
- Patient list row gets the same badge so front desk can see debtors at a glance.

---

## 4. Diagnosis persistence + 043 form

Current state: `appointment_diagnoses` table exists; the Diagnosis tab writes to it but the 043 export doesn't read from it, and tooth-scoped diagnoses from the dental chart aren't merged in.

Changes:

- Confirm every diagnosis write path (general modal + tooth annotation modal) inserts into `appointment_diagnoses` with `tooth_number` set when applicable, `icd_code`, `description`, `severity`, `notes`, `diagnosed_at`.
- Wire the Diagnosis tab list to also render tooth diagnoses (join `patient_bone_annotations` / `tooth_records` where they carry a diagnosis) so the doctor sees a single unified list — same source used by the 043 exporter.
- Update the 043 form generator (in `supabase/functions/generate-043-form` or the client-side builder — I'll read to confirm which) so the "Diagnosis" table (section 12/13 depending on template) is populated from `appointment_diagnoses` for the appointment: columns = date, ICD-10, description, tooth (if any), severity. Empty rows only when there are truly zero diagnoses.
- Realtime refresh on the Diagnosis tab already exists; verify it fires after tooth-annotation saves too.

---

## Technical notes

- Migrations needed:
  1. `ALTER TABLE billing_transactions ADD COLUMN appointment_procedure_id uuid UNIQUE REFERENCES appointment_procedures(id) ON DELETE CASCADE;`
  2. `CREATE FUNCTION public.autobill_appointment_procedure()` + triggers for INSERT/UPDATE/DELETE.
  3. `CREATE VIEW public.patient_outstanding_balance_v WITH (security_invoker=on) AS ...`; `GRANT SELECT` to `authenticated`.
- No schema change needed for diagnoses — table already covers it.
- All new UI strings use existing `useTranslation('dashboard')` / `'finance'` / `'prescriptions'` namespaces to avoid a namespace explosion.
- No mock data anywhere; empty states must be real i18n keys.

---

## Out of scope (call out if you want them)

- Stripe/actual online payment collection (previous thread) — unchanged here.
- Locales other than en/ru/uz (they'll continue falling back to English).
- Redesigning the 043 form layout — only wiring diagnosis data into the existing template.

Confirm and I'll implement in this order: migrations → auto-bill trigger → outstanding view + profile badge → diagnosis→043 wiring → i18n sweep last (so all new strings get keyed in one pass).
