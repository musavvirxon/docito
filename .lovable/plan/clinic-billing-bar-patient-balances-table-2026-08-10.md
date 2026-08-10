# Clinic Billing Bar + Patient Balances Table

Add a second bar to the clinic admin Billing section, matching the billing bar already used on the doctor dashboard, plus an admin-only table of who paid, who owes, and which doctor they belong to.

## What the admin will see

Directly under the Billing tab row (Overview / Invoices / Transactions / Superbills / Settings), a new panel appears on the Overview tab:

1. **Billing bar** — the same summary strip used for doctors: Amount to bill, Discounts, Paid, Outstanding, in the clinic's selected currency, respecting the existing date-range buttons (7d / 30d / 90d).
2. **Patient balances table** — one row per patient in the clinic:
   - Patient name (registered or walk-in)
   - Assigned doctor
   - Total billed
   - Total paid
   - Outstanding (owed)
   - Last activity date
   - Rows sorted newest activity first by default
3. **Filters** — doctor dropdown (clinic doctors only), text search by patient, and sort toggles for amount owed and amount paid (high→low / low→high), plus a "only with balance" switch.
4. Expanding a row reveals that patient's individual charge and payment lines with dates, same line-item style as the visit billing panel.

## Technical details

- New hook `src/hooks/usePracticeBillingAggregate.ts`: reads `billing_transactions` and `payments` filtered by `practice_id` and `created_at` within the selected range, ordered by date. Returns the same shape as `useDoctorBillingAggregate` (totalBilled / totalDiscounts / totalPaid / outstanding / currency) so it can be passed straight into `<AppointmentFinancePanel overrideData={...} />` — no changes to that component.
- Same hook also groups rows by `patient_id` (falling back to `metadata.patient_name` for manual/walk-in patients who have no profile row) and by `doctor_id`, producing the per-patient rows. Patient and doctor names are hydrated with one `profiles` lookup for the ids present.
- New component `src/components/billing/PracticePatientBalances.tsx` holding the table, filters and expandable rows. Filtering/sorting is client-side over the already-fetched range.
- `src/pages/AdminDashboard.tsx`, `case "billing"` → Overview tab: render the panel + table above the existing revenue cards, reusing `billingRange` and `moneyCents` for currency conversion.
- All labels added as `admin.bl.*` / reused `finance.*` keys in EN, RU and UZ locale files; no hardcoded strings.
- No database changes: `practice_id`, `doctor_id`, `patient_id` already exist on `billing_transactions` and `payments`, and existing RLS scopes rows to the admin's practice.
