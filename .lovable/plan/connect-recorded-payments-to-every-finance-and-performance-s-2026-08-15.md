# Connect recorded payments to every finance and performance statistic

Recorded payments now drive Total Earnings, This Month/Week and the earnings chart. Everything else on the finance and performance screens still runs on estimated appointment prices, so services, pending, insights, advanced KPIs, superbills and the performance tab disagree with what was actually collected.

## Confirmed current state
- The billing ledger already holds the truth: charges carry `amount_cents` and `paid_cents` (currently 9 charge rows, 2 fully paid, 1 partly paid), plus separate `payment` rows.
- `useFinancialStats` builds Services revenue, Payouts and Insights from `completedAppointments` and procedure list prices, not from payments or ledger allocations.
- Pending payments push tooth-procedure rows at full cost with a hard-coded `unpaid` status and never subtract ledger allocations for those rows.
- `useDoctorPerformance` computes `monthlyRevenue` and per-service revenue from appointment/procedure prices; that same number is passed into `useAdvancedFinancialMetrics`, so every KPI (ROI, margins, run rate, LTV, CAC ratio) inherits the estimate.
- `useSuperbills` reads `superbills` only; nothing reconciles a superbill against payments received.

## What will change

1. **One shared payment source**
   - Extract the collected-payments + ledger normalization currently inside `useFinancialStats` into a reusable helper (payments, ledger payment rows, dedup, per-charge and per-appointment allocation maps).
   - Both the financial stats hook and the performance hook consume this helper so they can never diverge.

2. **Services**
   - Service revenue becomes money actually collected, attributed via payment allocation to the charge's procedure; fall back to the linked appointment procedure when an older payment has no allocation.
   - Each service row also shows billed vs collected vs outstanding so a busy-but-unpaid service is visible rather than hidden.
   - The performance tab's service table uses the same numbers.

3. **Pending / outstanding**
   - Pending rows are derived from ledger charges: remaining = `amount_cents - paid_cents`, with fully paid charges dropped and partly paid ones showing the true remainder.
   - Tooth procedures and appointment procedures reconcile against their ledger charge instead of always listing full cost; only items with no ledger charge fall back to their own cost.
   - Status labels reflect real state: unpaid, partially paid, paid.

4. **Insights**
   - Most profitable service, busiest days and revenue-per-hour are computed from collected payments in the selected range.
   - Refund rate uses refunded/voided ledger and payment rows rather than cancelled appointments alone.
   - Payout records are built from collected revenue per month, not from completed-appointment estimates.

5. **Advanced KPIs**
   - The performance tab passes collected revenue (not appointment estimates) into `useAdvancedFinancialMetrics`, so ROI, ROAS, margins, EBITDA, run rate and LTV/CAC are based on real cash.
   - Average revenue per customer uses paying patients.

6. **Superbills**
   - Each superbill is reconciled with payments on its appointment/invoice: show amount paid and balance, and surface a paid indicator when the collected amount covers the total.
   - Superbill totals in the summary cards split issued vs collected.

7. **Refresh wiring**
   - Recording a payment (general or per procedure) invalidates the financial stats, performance, advanced metrics, superbills and billing aggregate queries together so every card, chart and table updates at once.

## Verification
- August payments already in the database must reconcile: services + pending + insights totals must match the collected ledger total for the doctor.
- Record one new payment and confirm it appears exactly once in earnings, reduces the matching service's outstanding and the pending row, and shifts the KPI revenue base.
- Check a manual (non-registered) patient payment path and a partly paid charge.

## Technical scope
- `src/hooks/useFinancialStats.ts` (extract shared payment normalization, rework services/pending/insights/payouts).
- New helper module for payment normalization and allocation maps.
- `src/hooks/useDoctorPerformance.ts`, `src/hooks/useAdvancedFinancialMetrics.ts`, `src/hooks/useSuperbills.ts`.
- `src/components/doctor/DoctorPerformanceSection.tsx`, `src/components/doctor/DoctorFinancialStatsSection.tsx` and the performance sub-components that render service/insight numbers.
- i18n keys added for any new labels (EN, RU, UZ). No schema change required.
