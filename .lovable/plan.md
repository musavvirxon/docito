# Patient Billing: Charges, Payments, Running Balance

## What already exists (verified in this codebase)

- `billing_transactions` is the charges table: it has `patient_id`, `practice_id`, `appointment_id`, `amount`/`amount_cents`, `currency`, `transaction_type` ('charge' / 'discount'), `description`, and a unique `appointment_procedure_id` link back to a procedure done in a visit.
- `payments` is the payments table: `patient_id`, `practice_id`, `appointment_id`, `amount`, `currency`, `payment_method`, `status`, `notes`, `paid_at`.
- Balance is already computed live by the `patient_outstanding_balance_v` view (charges − discounts − payments, grouped by currency) — no stored balance column anywhere.
- A DB trigger (`autobill_appointment_procedure`) already creates a charge automatically when a procedure is added to an appointment.
- The appointment session page already has a finance panel (`AppointmentFinancePanel`) and both doctor patient-detail screens already have a "Billing" tab.
- Currency is centralised in `CurrencyContext` / `useCurrency`.

So this is an **extension of the existing model, not two new tables**. Adding new `charges`/`payments` tables would create exactly the duplicate data path the request warns against.

## What will be built

### 1. Database (one migration)

- Add `opening_balance_amount` (numeric, nullable), `opening_balance_currency` (text, default 'uzs'), `opening_balance_date` (date, nullable) to `profiles`.
- New view `patient_ledger_v` (`security_invoker=on`): a chronological union of
  - opening balance row (if set),
  - charges from `billing_transactions` (charge / discount),
  - payments from `payments`,
  with `patient_id`, `practice_id`, `entry_date`, `kind`, `description`, `charge_cents`, `payment_cents`, `currency`, `source_id`. Running balance is computed in the query/UI, never stored.
- Update `patient_outstanding_balance_v` to include the opening balance in its totals.
- No new scoping convention: both underlying tables already carry `practice_id` and existing RLS on them (plus the security-invoker views) keeps one clinic from reading another clinic's rows. The migration will re-verify and, if any gap is found, tighten the policy to the same `practice_id` pattern used on patient records.

### 2. Currency

Patient billing keeps using `useCurrency` (unrelated to Docito's own subscription billing). Default currency for new charges/payments becomes **UZS**, formatted as thousands-separated whole numbers with no decimals (`450 000 so'm`) via a small shared formatter used by both surfaces.

### 3. Surface 1 — Appointment / visit view

Extend `AppointmentFinancePanel` (already mounted in `AppointmentSession`) so the Billing block shows:
- charges recorded during this visit, with an **Add charge** action (description + amount),
- **Record payment** action dated today, with method cash / card / bank transfer / insurance / other (matches the method set already used by `useAppointmentFinance`),
- this visit's subtotal, plus the patient's prior balance line.

### 4. Surface 2 — Patient profile "Financial" tab

New `PatientFinancialTab` component, mounted in place of / alongside the existing "Billing" tab in `DoctorPatientDetailSection` and `PatientDetailSection`:
1. Outstanding balance at the top, large — destructive/warning token when > 0, neutral muted when settled (matching `PatientOutstandingBadge`'s existing convention).
2. One chronological bank-statement ledger: date | description | charge | payment | running balance, opening balance as the first row.
3. Newest-first by default with a simple date-range filter.
4. Clean empty state when there is no activity.

Opening balance becomes an optional field on the existing patient create/edit form (`CreatePatientModal` / patient edit) — no new onboarding flow.

### 5. Treatment plan / tooth chart integration

In the treatment plan detail modal, when a procedure is marked **completed**, show a confirm dialog pre-filled with the procedure name + tooth number (FDI) and the price from the procedure/price list if available, amount editable. The charge is only written after the dentist confirms — never silent. Charges created this way write to `billing_transactions` with a `treatment_plan_procedure_id` reference in `metadata`, so they appear in both surfaces immediately.

### 6. i18n

All new strings go through the `finance` namespace with keys added to `en`, `ru`, `uz` (`addCharge`, `recordPayment`, `runningBalance`, `openingBalance`, `ledger`, `settled`, empty states, method labels). No hardcoded text.

## Acceptance

- One data path: both surfaces read/write `billing_transactions` + `payments`.
- Balance always from the live views.
- Opening balance is the first ledger row and included in the total.
- Completion prompt requires confirmation.
- Zero-activity patient shows an empty state.
- RLS verified per-clinic.
- Responsive: ledger collapses to stacked cards on mobile.
