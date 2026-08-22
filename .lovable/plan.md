# Record Payment: choose patient, then optionally a procedure

In the aggregate billing bar (doctor financial stats, clinic admin billing) the general "Record Payment" dialog currently applies money oldest-first across every unpaid charge of every patient. It gets two new fields.

## What changes for users

1. **Patient (required)** — a dropdown listing every patient who has an unpaid charge in the current view, with their outstanding total next to the name. The Record button stays disabled until a patient is picked.
2. **Procedure (optional)** — a second dropdown, filtered to that patient's unpaid procedures (oldest first), each showing its remaining amount. Default option is "All (oldest first)".
3. **Amount pre-fill** — selecting a patient fills the amount with that patient's outstanding balance; selecting a procedure narrows it to that procedure's remaining amount.
4. **Allocation** — with only a patient chosen, the payment is applied to that patient's oldest unpaid procedure first, spilling into the next; with a procedure chosen, it goes to that charge only.
5. Per-procedure "Pay" buttons on the rows and the single-visit Billing tab keep working exactly as today (patient is already known there, so the new selectors do not appear).

## Technical notes

- `src/components/billing/RecordPaymentDialog.tsx`: add optional props `patients` (id, label, outstanding), `charges` (grouped per patient: id, description, date, remaining), `requirePatient`. When `requirePatient` is set, render the two Selects above Amount, keep the selection in local state, reset on open, drive the amount pre-fill, and pass `{ patientKey, chargeId }` back through `onSubmit`. Without these props the dialog renders as it does now.
- `src/components/appointments/AppointmentFinancePanel.tsx`:
  - Build the patient/procedure options from `unpaidCharges` when there is no `appointmentId` (aggregate mode). Group by `patient_id`, falling back to `appointment:<appointment_id>` for manually added patients, and resolve labels through the existing `nameMap` (same keys `renderChargeName` already uses).
  - Pass those options plus `requirePatient` to the general `RecordPaymentDialog`.
  - In `handleRecordPayment`, when a `chargeId` comes back apply the payment to that charge only; otherwise run the existing FIFO loop restricted to the selected patient's charges instead of all charges.
- No database or RPC changes — `record_billing_payment` already accepts `p_charge_id` and handles allocation and authorization.
- i18n: add `finance`/`appointments` keys for the patient label, procedure label, "All (oldest first)" option and the "select a patient" validation message in EN, RU and UZ.
