# Fix empty/incorrect Billing tab financial cards

## Diagnosis (confirmed against live data)

The Billing tab in the appointment session (`AppointmentFinancePanel` + `useAppointmentFinance`) shows "0 soʻm" on all four cards even when the patient has real financial history. Three confirmed bugs:

1. **Currency conversion is dropped.** The panel defines `fmt = (n, _currency) => ctxFmtMajor(Number(n || 0))` — it ignores the source currency argument. All billing rows are stored in USD (the `autobill_tooth_procedure` trigger hardcodes `'usd'`), so $1,203 renders as "1 203 soʻm" with no USD→UZS conversion.
2. **"Prior unpaid balance" is not scoped to the patient.** The prior-balance query fetches *every* pending/unpaid/outstanding `billing_transactions` row visible to the doctor (no `patient_id` filter). Verified: the banner's 1,203 is exactly the sum of all pending charges across all patients (240+360+300+3+300), while the open patient actually owes 603. It also counts each charge's full amount instead of its remaining balance.
3. **Cards ignore prior balance.** "Outstanding" only covers the current visit (0 for a new visit), so the cards look empty while the patient actually owes money — the prior debt only appears as a small banner.

## Changes

### 1. `src/hooks/useAppointmentFinance.ts`
- Accept an optional `doctorPatientId` param (for manual patients whose `patient_id` is null).
- Scope the prior-balance query to the current patient:
  - Registered patient: `.eq('patient_id', patientId)`.
  - Manual patient: resolve the patient's other appointments via `doctor_patient_id` and filter billing rows to those `appointment_id`s.
- Compute `priorBalance` as the sum of each prior charge's **remaining** amount (using the existing `chargeRemaining` helper), not the full charge amount.

### 2. `src/components/appointments/AppointmentFinancePanel.tsx`
- Fix `fmt` to pass the source currency through: `ctxFmtMajor(n, cur || finance.currency)` so stored USD amounts convert to the user's display currency (UZS) via FX rates. Pass each row's own `currency` for charge/payment list rows.
- Make the **Outstanding** card show total owed (this visit + prior balance) so the cards reflect the full financial picture; keep the amber banner as the breakdown ("of which prior visits: X").
- Thread `doctorPatientId` into the hook.

### 3. `src/pages/AppointmentSession.tsx`
- Pass `appointment.doctor_patient_id` to `AppointmentFinancePanel` (new optional prop).

### 4. i18n
- Add/adjust the breakdown label keys (e.g. `finance.priorBalanceShort`) in `public/locales/en`, `ru`, `uz` (`appointments`/`finance` namespaces).

## Technical notes
- No database migration required — triggers and schema are correct; this is a frontend data-scoping and formatting fix.
- `useCurrency().format(amount, sourceCurrency)` already converts using live `fx_rates`; the panel was simply discarding the argument.
- `chargeRemaining`/`chargePaid` already exist in `src/lib/billing/recordBillingPayment` and account for FIFO payment allocations.

## Verification
- Reload the same appointment's Billing tab: prior balance shows 603 (converted to soʻm) for the registered patient instead of 1,203; Outstanding card includes it.
- Open a brand-new manual patient's visit: prior balance is 0, no misleading banner.
- Add a procedure with a price: Amount to bill / Outstanding update immediately with correctly converted currency.
