# Full patient financial history

Add a button on the appointment Billing panel that opens a complete financial picture for that patient — every past visit with its procedures and cost, what was paid, the running balance, and the ability to record a payment right there.

## What the user sees

A new "Full financial history" button next to Record Payment / Add charge in the billing panel. It opens a wide dialog with:

1. **Summary strip** — Total billed, Total paid, Discounts, and Outstanding (or green Credit balance when the patient overpaid), all in the viewer's display currency.
2. **Visits & procedures** — one collapsible row per appointment (newest first): date, doctor, appointment type, and beneath it every charge line (procedure name, teeth if dental, amount). Each visit shows Billed / Paid / Remaining. Charges with no appointment are grouped under "Other charges".
3. **Ledger** — the existing chronological statement (charges, discounts, payments, running balance) reused from the patient financial tab, with the date filter.
4. **Record Payment** — same dialog already used elsewhere; after saving, the history refreshes in place and the parent billing panel refreshes too.

Works for both registered patients and manually added patients. Empty states shown when a patient has no charges yet — no placeholder data.

## Technical notes

- New hook `src/hooks/usePatientFinancialHistory.ts`: reads `billing_transactions` for the patient (scoped by `patient_id`, or the manual-patient link when the patient is a `doctor_patients` row), joins the related `appointments` rows for date/type/doctor, and groups charges/discounts/payments per `appointment_id`. Amounts normalised through `useCurrency().convert` from each row's own currency.
- New component `src/components/patient/PatientFinancialHistoryDialog.tsx`: presentational, takes `patientId`, `doctorPatientId`, `patientName`, `open`, `onOpenChange`, `onPaymentRecorded`. Embeds `PatientFinancialTab` for the ledger section and `RecordPaymentDialog` for the payment action.
- `src/components/appointments/AppointmentFinancePanel.tsx`: add the button (visible whenever payments/actions are enabled and a patient id is known) plus the dialog mount; wire `onPaymentRecorded` to the existing refresh callback.
- i18n: new keys under the `finance` namespace (`history.title`, `history.button`, `history.visits`, `history.otherCharges`, `history.billed`, `history.remaining`, `history.noHistory`) for EN, RU and UZ.
- No schema changes; read-only queries over existing tables plus the existing payment path.
