## Goal

1. Treat **Consultation** as a real procedure that appears in the doctor's Procedures section and shares the same backend value the doctor set during verification (`doctors.consultation_fee` + selected `consultation_types`).
2. Make the **Mark as Paid** button in Financial → Pending actually record the payment (method, amount, invoice number, notes) into the `payments` table.
3. Surface those payment records on the patient side (patient's own dashboard finance tab) and on the doctor's view of the patient (PatientDetail/PatientProfile finance area).

## 1. Consultation as a procedure

When a doctor completes/updates verification (`DoctorVerification.tsx`) or when their procedures list is first loaded (`useDoctorServices` / `DoctorProceduresSection`), ensure exactly one canonical row exists in `procedures` for that doctor representing the consultation:

- `name`: "Consultation"
- `category`: `Consultation`
- `default_cost`: doctor's `consultation_fee`
- `duration_minutes`: 30 (default)
- `is_active`: true
- marked as a system row so it can't be deleted, only edited (price/duration/active toggle)

Mechanism:
- Add a `is_system_consultation boolean default false` column to `procedures` (nullable safe).
- Add a Postgres trigger / RPC `ensure_doctor_consultation_procedure(doctor_id)` that upserts the row when a doctor is created or when `consultation_fee` is updated, keeping `default_cost` in sync with `doctors.consultation_fee`.
- Call it from the verification submit path; also call it lazily from `useDoctorServices.fetchServices` if missing.
- In `DoctorProceduresSection`, render the consultation row first, hide Delete, keep Edit (price/duration). Saving its price writes back to both `procedures.default_cost` and `doctors.consultation_fee`.

Result: Consultation is bookable, appears in the picker, and uses the same fee the doctor configured at verification — no more separate fallback `consultationFee` magic in `useFinancialStats`.

## 2. Real "Mark as Paid" flow

Replace the toast-only handler in `src/components/doctor/FinancialPending.tsx` with a dialog:

Fields:
- Payment method (select: cash, card, bank transfer, insurance, other)
- Amount paid (prefilled with `payment.amount`, editable)
- Invoice number (auto-generated `INV-YYYYMMDD-####`, editable)
- Notes (optional)
- Paid at (defaults to now)

On submit: insert a row into `public.payments` with `appointment_id`, `practice_id`, `patient_id`, `amount`, `status='paid'`, `payment_method`, `transaction_id` (invoice number), `notes`, `paid_at`. Also update the linked appointment's status flag so it disappears from the pending list.

Add an RLS-checked helper hook `useRecordPayment` for the insert, and refresh `useFinancialStats` after success.

## 3. Surface payments on patient profiles

- **Patient's own account** (`PatientFinanceSection` already accepts a `payments` prop): wire it to query `payments` filtered by `patient_id = current user's patient id`, joined with appointment + doctor + procedure name. Show date, doctor, service, amount, method, invoice #, status. Allow PDF/receipt download (reuse existing `generateInvoicePdf`).
- **Doctor's view of patient** (`DoctorPatientDetailSection` / `PatientDetailSection`): add a "Billing & Payments" sub-section listing payments where `doctor_id = current doctor` AND `patient_id = viewed patient`, same columns + running total.

## Technical Details

Files to change:
- `supabase/migrations/<new>.sql` — add `procedures.is_system_consultation`, add `ensure_doctor_consultation_procedure(uuid)` SECURITY DEFINER function, trigger on `doctors` insert/update of `consultation_fee`, and an RLS policy review for `payments` (patient can SELECT own; doctor/practice staff can SELECT/INSERT for their patients).
- `src/pages/doctor/DoctorVerification.tsx` — call the RPC after doctor upsert; persist a real `consultation_fee` (not hardcoded `0`).
- `src/hooks/useDoctorServices.ts` / `src/hooks/useProcedures.ts` — surface `is_system_consultation`, block delete, keep update.
- `src/components/doctor/DoctorProceduresSection.tsx` — pin consultation row, hide delete, sync edits back to `doctors.consultation_fee`.
- `src/hooks/useFinancialStats.ts` — remove fallback that injected $100 consultations; rely on the real procedure row.
- `src/components/doctor/FinancialPending.tsx` — new MarkAsPaidDialog, calls insert into `payments`.
- `src/hooks/useRecordPayment.ts` (new) — insert helper + invoice number generator.
- `src/components/PatientFinanceSection.tsx` and its parent in `PatientDashboard.tsx` — fetch real `payments`.
- `src/components/doctor/patients/DoctorPatientDetailSection.tsx` (+ `PatientDetailSection.tsx`) — new Billing tab/section.

Data shape for `payments` insert:
```ts
{
  appointment_id, practice_id, patient_id,
  amount, status: 'paid',
  payment_method, transaction_id: invoiceNumber,
  notes, paid_at: new Date().toISOString()
}
```

## Out of scope

- Stripe/online payment capture (manual record only).
- Refund/void flow (can be added later).
- Multi-currency conversion (uses existing `CurrencyContext`).
