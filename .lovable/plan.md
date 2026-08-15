# Make recorded payments drive doctor financial statistics

## Confirmed diagnosis
- August payments are present in `payments`, carry the doctor and appointment IDs, and have matching `finance_entries` records.
- The billing bar reads those records correctly.
- Doctor statistics currently combine two different meanings of revenue: completed-appointment price estimates and collected payments. Summary cards use `Math.max(estimated, collected)`, so a newly recorded payment is invisible whenever estimated revenue is already higher. The earnings chart adds payments on top of appointment estimates, which can also double-count revenue.
- The payment action refreshes the statistics hook but does not refresh the aggregate billing hook through the same callback.

## Implementation
1. **Use collected payments as the source of truth for earnings**
   - Refactor `useFinancialStats` so Total Earnings, This Month, This Week, and Earnings Over Time are calculated from valid payment records only.
   - Keep billed and unpaid amounts separate from collected earnings; do not substitute appointment prices for payment revenue.
   - Include both registered-patient rows from `payments` and manual-patient payment rows from `billing_transactions`, excluding failed, voided, and refunded records.
   - Deduplicate by payment identity/source so a payment cannot appear twice.

2. **Correct date-range behavior**
   - Compare payment timestamps against full-day range boundaries so the selected end date includes the entire day.
   - Build chart points from stable ISO dates, then format labels for display, preventing locale/time-zone key mismatches.

3. **Keep related statistics consistent**
   - Calculate net earnings and commission from collected revenue rather than estimated completed appointments.
   - Attribute service/patient statistics from payment allocations where available; retain a safe fallback label when an older payment lacks allocation metadata.
   - Leave outstanding balances based on charge totals minus paid/discounted amounts.

4. **Refresh every affected view immediately**
   - After recording a general or per-procedure payment, refresh both doctor statistics and the aggregate billing panel so cards, chart, payment history, and remaining balances update together.

5. **Verify with real August data**
   - Confirm the August payment total shown by the statistics equals the valid August payment ledger total for the doctor.
   - Verify a newly recorded payment changes the current-period card and chart exactly once and reduces outstanding balance by the same amount.
   - Check 7-, 30-, and 90-day ranges and a manual-patient payment path.

## Technical scope
- Primary files: `src/hooks/useFinancialStats.ts` and `src/components/doctor/DoctorFinancialStatsSection.tsx`.
- Supporting billing types/helpers may be extracted only if needed to keep payment normalization shared and testable.
- No schema change is currently required because the inspected August records and finance ledger entries already exist.