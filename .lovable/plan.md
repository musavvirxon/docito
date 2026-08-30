# Automatic commission accrual ledger

Replace the "revenue in period × current rate" math in the Doctor Payments tab with a real, event-driven ledger: every collected payment automatically creates a commission accrual row at the rate in force at that moment, and admins record payouts against the running balance.

## How it behaves

- A payment is recorded anywhere in the app (visit billing bar, record-payment dialog, ledger, invoice flows). If the treating doctor has an active percentage-of-doctor-revenue compensation profile, the database itself writes a commission accrual for that payment — snapshotting the rate used, so later rate changes never rewrite history.
- If that payment is later refunded, failed, voided or cancelled, the matching accrual is marked voided and drops out of the balance.
- Admin (Finance → Doctor Payments) sees per doctor: accrued total, paid-out total, balance owed, plus an itemized, auditable list of accruals (payment date, gross amount, rate, commission). A **Record payout** action logs an actual payout, capped at the current balance.
- Net settlement = running commission balance owed − rent owed for the period (replacing the old on-the-fly commission figure).
- Doctor (My Payments) sees their own accrual history, total paid out and balance owed — read-only.
- Doctors can no longer self-report "commission received"; rent payment stays the only submittable type.

Worked example: Doctor B on 50% → a $20,000 payment creates a $10,000 accrual. Admin records a $6,000 payout → balance owed $4,000.

## Technical details

### Migration 1 — accrual + payout tables

`public.doctor_commission_accruals`: `id`, `entity_type text`, `entity_id uuid`, `doctor_user_id uuid`, `source_payment_key text unique`, `gross_amount_cents bigint`, `percentage_rate numeric`, `compensation_profile_id uuid`, `commission_amount_cents bigint`, `appointment_id uuid`, `patient_id uuid`, `status text default 'active' check in ('active','voided')`, `accrued_at timestamptz`, `created_at timestamptz`.

`public.doctor_commission_payouts`: `id`, `entity_type`, `entity_id`, `doctor_user_id`, `amount_cents bigint`, `paid_at timestamptz`, `paid_by uuid`, `notes text`, `created_at`.

Grants and RLS (no `anon`):

```sql
GRANT SELECT ON public.doctor_commission_accruals TO authenticated;
GRANT ALL ON public.doctor_commission_accruals TO service_role;
GRANT SELECT, INSERT ON public.doctor_commission_payouts TO authenticated;
GRANT ALL ON public.doctor_commission_payouts TO service_role;
ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
```

Policies:
- Accruals: SELECT where `doctor_user_id = auth.uid()`; SELECT where `public.can_access_entity(entity_type, entity_id)`. No client INSERT/UPDATE — only the SECURITY DEFINER trigger writes.
- Payouts: SELECT for the doctor themselves and for entity admins/staff via `can_access_entity`; INSERT only with `can_access_entity(...) AND paid_by = auth.uid()`. No UPDATE/DELETE.

### Migration 2 — accrual trigger

One `SECURITY DEFINER` function with pinned `search_path`, attached `AFTER INSERT OR UPDATE` on both `public.payments` and `public.billing_transactions`.

Status rules mirror `src/lib/finance/doctorCollections.ts` exactly:
- payments: collected when `status` ∈ (`paid`,`completed`,`succeeded`,`partial`); key `payment:<id>`; amount `amount * 100`; date `coalesce(paid_at, created_at)`.
- billing_transactions: collected when `transaction_type = 'payment'` and lower(status) ∉ (`refunded`,`failed`,`voided`,`canceled`,`cancelled`); key `ledger:<id>`; amount `coalesce(amount_cents, amount*100)`; date `created_at`.

Rate lookup: from `doctors` on the row's `doctor_id`, take `user_id`; pick the newest `staff_compensation_profiles` row with `compensation_type='percentage'`, `percentage_of='doctor_revenue'`, `is_active`, `effective_from <= payment date`. No match → no accrual. `appointment_fee` / `procedure_fee` are out of scope this pass.

Entity scope: from the compensation profile's own `entity_type`/`entity_id` (falls back to `practice` + the doctor's `practice_id`), since `payments` has no entity columns.

Insert with `ON CONFLICT (source_payment_key) DO NOTHING`. Commission = `round(gross_amount_cents * percentage_rate / 100)`, stored once.

Void path: when the source row moves into a dead status (or a payment leaves the collected set), `UPDATE doctor_commission_accruals SET status='voided' WHERE source_payment_key = ...`; moving back to collected reactivates it.

Backfill: the migration runs a one-time pass over existing collected payments/transactions through the same function logic, so current doctors don't start at zero.

### Migration 3 — submission type

Drop and recreate the `payment_type` check on `doctor_payment_submissions` to allow `rent_payment` only. Existing `commission_received` rows are left as-is (constraint added as `NOT VALID` so history isn't destroyed).

### Frontend

- `src/hooks/useDoctorCommissionLedger.ts` (new) — accruals + payouts by `{entityType, entityId}` (admin) or `doctorUserId` (doctor); returns per-doctor accrued/paid/balance totals and a `recordPayout` helper.
- `src/components/financial/DoctorSettlementsPanel.tsx` — remove the `fetchDoctorCollections`/`collectedInRange` commission computation; settlement rows read `commissionCents` from the ledger balance. Add accrued/paid/balance columns, a **Record payout** dialog (amount capped at balance, optional note), and an expandable itemized accrual list per doctor. Submission type label logic drops the commission branch.
- `src/hooks/useMyDoctorFinance.ts` — also load the signed-in doctor's accruals and payouts.
- `src/components/doctor/MyPaymentsSection.tsx` — add accrued / paid-out / balance cards and an accrual history list; the log-payment dialog loses the "Commission received" option and becomes rent-only.
- `public/locales/{en,ru,uz}/dashboard.json` — new keys under `doctorSettlements.*` and `myPayments.*`, read via `useTranslation('dashboard')`.

### Out of scope

Rent math, `CompensationManager`, and settlement-record persistence stay as they are.
