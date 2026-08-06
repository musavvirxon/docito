# Bill every added procedure, listed line by line

## What's wrong today

For this visit the database has one dental procedure (Consultation, teeth 11/12/13, 300) but **zero** billing rows and zero payments. Two causes, confirmed:

1. Dental procedures added from the tooth chart (`useDentalChart.addProcedureToTeeth`) never create a charge at all — only the procedures panel path attempts one.
2. The one path that does attempt a charge inserts it without `patient_id` / `practice_id`, so it can be rejected by the billing access rule and, even when it lands, it is invisible to the patient ledger and outstanding-balance views (both key off `patient_id`).

Result: the Billing tab shows "no charges", the amount to bill stays empty, and nothing flows into the patient's outstanding balance.

## The fix

**1. Auto-bill in the database (single source of truth)**

Add a trigger on `tooth_procedure_history` (insert, and update of cost/name/status) that creates or updates one charge row in `billing_transactions` per procedure entry, filling in `patient_id`, `practice_id`, `appointment_id`, currency, and a description with the procedure name and tooth list. Deleting a procedure removes its charge. The equivalent trigger already exists for non-dental `appointment_procedures`; it will be aligned so both fill `patient_id`/`practice_id` the same way.

Each charge row is linked to its source procedure so re-saving never duplicates it.

**2. Backfill**

Create the missing charges for existing completed procedures that have a cost and no matching charge, so current visits (including this one) stop showing zero.

**3. Stop the client double-writing**

Remove the manual charge insert in `useAppointmentProcedures` now that the trigger owns it, so only one charge exists per procedure.

**4. Show each procedure separately in Billing**

In the Billing tab's charge list, render one line per charge with:
- procedure name
- tooth badges when the procedure is tooth-based
- date
- amount, in the user's selected currency

with the visit subtotal underneath, unchanged. No grouping or merging of same-named procedures — three separate procedures show as three separate lines.

## Technical notes

- Migration: `autobill_tooth_procedure()` trigger function + triggers on `tooth_procedure_history`; update `autobill_appointment_procedure()` to always set `patient_id`/`practice_id`; one-time backfill statement. Charges keyed by `metadata->>'source_id'`.
- Currency resolved from the procedure/appointment, stored lowercase; display conversion stays in `useCurrency`.
- Frontend: `AppointmentFinancePanel.tsx` charge list gains teeth/date metadata (read from `billing_transactions.metadata`); `useAppointmentProcedures.ts` drops its manual billing insert and its delete-cleanup block.
- i18n: reuse existing `finance.*` keys; add tooth-list and date labels for en/ru/uz if missing.
