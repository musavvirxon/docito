# Billing bar fixes: remaining per procedure, correct totals, discounts, true FIFO, live stats

## What's wrong today (verified)

- **Allocation order.** Every charge row in the ledger carries the same `created_at` (they were backfilled in one batch), while the panel shows the procedure's real `performed_at` date. The payment RPC allocates by `created_at ASC`, so with identical timestamps the order is arbitrary — payments land on whatever row Postgres returns first, which looks like "the latest procedure".
- **Total paid is wrong on the dashboard bars.** `useDoctorBillingAggregate` treats ledger rows with `transaction_type = 'payment'` as charges (it only filters out `discount` and `refund`), so a manual-patient payment both inflates "amount to bill" and is missing from "paid". There is at least one such payment row in the data today.
- **Rows don't show what's left**, and the labels `ledger.pay` / `ledger.paidOf` render as raw keys because those translation keys don't exist.
- **Payments don't reach the stats.** "Earnings over time" (`useFinancialStats`) is computed purely from completed appointments × procedure price; it never reads the `payments` table or the finance ledger, so a recorded payment changes nothing in the chart or KPIs.

## What changes for users

1. Each procedure row shows: total, amount paid, **amount left**, and a Paid / Partially paid / Unpaid badge.
2. General "Record payment" always settles the **earliest procedure by the date shown on the row**, then spills into the next.
3. The payment dialog gets an optional **Discount** field — the discount is recorded against the same charge(s) and reduces what's owed, separately from the cash collected.
4. "Paid", "Amount to bill" and "Outstanding" on the doctor and clinic billing bars match the rows below them.
5. Recorded payments immediately appear in Earnings over time, earnings KPIs and the finance ledger, not only in the appointment-price estimate.

## Technical notes

**Database (migration)**
- `record_billing_payment`: change the allocation loop's ordering to `ORDER BY COALESCE((metadata->>'performed_at')::timestamptz, created_at) ASC, created_at ASC, id ASC` so FIFO follows the date users see.
- Add `p_discount_cents int default 0` to the RPC: it inserts a `discount` ledger row scoped to the same appointment/charge, credits the targeted charges' `paid_cents` alongside the cash amount (marking them settled), and records the split in `metadata.allocations`. Only the cash part is posted to `finance_entries` as income.
- Keep the existing authorization (`can_manage_patient_billing`) and the existing income entry in `finance_entries`.

**Frontend**
- `src/components/appointments/AppointmentFinancePanel.tsx`: per-row remaining/paid line plus status badge; general payment always goes through the RPC (drop the client-side per-charge loop) by passing `patientId` / `doctorId` / `practiceId` scope so the server does the FIFO.
- `src/components/billing/RecordPaymentDialog.tsx`: add the discount input and pass it through `src/lib/billing/recordBillingPayment.ts`.
- `src/hooks/useDoctorBillingAggregate.ts` (and the same check in `usePracticeBillingAggregate.ts`): exclude `transaction_type = 'payment'` from charges and add those rows to `totalPaid`, so billed/paid/outstanding are consistent.
- `src/hooks/useFinancialStats.ts`: build `earningsHistory`, `earningsThisMonth/Week` and total earnings from actual collected money — `payments` rows plus `billing_transactions` payment rows for the doctor in range — keeping the appointment-based figure as the "expected/billed" series so pending amounts still show. `DoctorFinancialStatsSection` already refreshes these on `onPaymentRecorded`.
- i18n: add `ledger.pay`, `ledger.paidOf`, `ledger.remaining`, `ledger.partiallyPaid`, `ledger.unpaid`, and the discount labels to the `finance`/`appointments` namespaces in EN, RU and UZ.
