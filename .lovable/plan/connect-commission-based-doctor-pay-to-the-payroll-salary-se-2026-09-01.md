# Connect commission-based doctor pay to the Payroll (salary) section

Today the Payroll tab in Finance only shows manually typed payroll entries. Commission-based doctors live in a separate "Doctor Payments" tab (accrual ledger + payouts), so commissions never appear as payroll cost. This connects the two.

## What changes

**1. Commission block inside the Payroll tab**

Above the manual payroll entries list, add a "Commission-based compensation" card that lists every doctor of the entity who has an active percentage compensation profile, with:
- rate (%) and what it is a percentage of
- total accrued commission
- total already paid out
- current balance owed
- a "Record payout" action (amount capped at the balance)
- expandable itemized accrual list (payment date, gross, rate, commission) so the number is auditable

This reads the same ledger the Doctor Payments tab uses, so both views always agree — no second calculation.

**2. Payouts count as payroll cost**

When an admin records a commission payout from the Payroll tab, it writes the payout row as it does today, and additionally posts a payroll finance entry (category "Doctor commission") for the same amount and date. That makes commissions flow into the Payroll total bar, the Overview payroll/costs KPI, budgets and reports — the same way salaries do.

To avoid double counting, the created payroll entry is linked to the payout (reference key), is created once, and the commission block clearly separates "accrued (not yet payroll cost)" from "paid out (posted to payroll)".

**3. Payroll totals bar**

The totals row at the top of the Payroll tab shows the manual payroll total plus commission payouts posted in the selected date range, and the grand total.

**4. Translations**

New keys in EN / RU / UZ using the existing `dashboard` namespace pattern already used by the Doctor Payments panel.

## Technical notes

- `src/components/financial/PayrollEntriesPanel.tsx`: mount a new `PayrollCommissionSummary` section; extend the totals memo with commission payouts in range.
- New `src/components/financial/PayrollCommissionSummary.tsx`: uses `useDoctorCommissionLedger({ mode: "entity" })` and `useCompensationProfiles` (filtered to `compensation_type = 'percentage'`), resolves doctor names via `profiles.user_id`.
- `src/hooks/useDoctorCommissionLedger.ts`: extend `recordPayout` with an optional `postToPayroll` flag that calls the existing `finance_entry_upsert_manual` RPC (kind `payroll`, idempotency/reference derived from the payout) and stores the resulting entry id in the payout's `notes`/metadata link.
- No schema change required beyond reusing existing tables; if a link column is preferred over notes, add `finance_entry_id uuid` to `doctor_commission_payouts` in a small migration.
- Doctor Payments tab keeps working unchanged and now shows payouts made from either place.
