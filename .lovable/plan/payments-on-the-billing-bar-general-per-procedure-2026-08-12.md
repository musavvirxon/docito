# Payments on the billing bar: general + per-procedure

Add payment recording directly to the billing bar (doctor financial stats, clinic admin billing, appointment session), including a "Record payment" button on every individual procedure/charge row. A general payment is automatically applied to the oldest unpaid charge first, and every payment flows into the same ledger all dashboards already read.

## What changes for users

1. **General "Record payment" button** on the billing bar (currently hidden on the doctor dashboard and clinic admin views). Enter amount, method, notes. The amount is applied oldest-charge-first (FIFO): it fully settles the earliest unpaid procedure, then spills into the next one, and so on. Any leftover stays as unallocated credit on the patient.
2. **Per-procedure "Pay" button** on each transaction row. Opens the same dialog pre-filled with that procedure's remaining balance and applies the payment to that charge only.
3. **Each row shows its own state**: remaining amount, a Paid / Partially paid / Unpaid badge, and the amount already collected against it.
4. **Payment history** below the list shows every payment with date, method, amount, and which procedures it settled.
5. The same panel behaves identically in the appointment session Billing tab, the doctor's Financial Statistics section, and the clinic admin patient-balances view (admins record payments for any patient of the clinic; doctors only for their own).

## Allocation rule

```text
Payment 500
  Charge A (oldest, remaining 200)  -> 200 applied, now Paid
  Charge B (remaining 240)          -> 240 applied, now Paid
  Charge C (remaining 300)          ->  60 applied, Partially paid (240 left)
  leftover 0
```

Refunds/voided payments reverse their allocations in the same order.

## Technical notes

**Database (migration)**
- Add `paid_cents integer NOT NULL DEFAULT 0` to `public.billing_transactions` so each charge row tracks how much of it has been settled. Backfill existing charges by applying today's recorded payments FIFO per appointment so the current data is consistent.
- New `SECURITY DEFINER` RPC `public.record_billing_payment(p_amount_cents int, p_method text, p_notes text, p_appointment_id uuid default null, p_patient_id uuid default null, p_doctor_id uuid default null, p_practice_id uuid default null, p_charge_id uuid default null)`:
  - Authorizes the caller (patient's treating doctor, or clinic staff/admin of the owning practice) using existing helpers (`has_role`, `can_access_practice`, doctor ownership) — no service-role bypass.
  - Selects target charges: the single `p_charge_id` when given, otherwise all charges for the scope with `amount_cents > paid_cents`, ordered by `created_at ASC`.
  - Increments `paid_cents` per charge, flips `status` to `paid` / `partial`, inserts one `payments` row when the patient is a real profile, otherwise a `billing_transactions` row with `transaction_type = 'payment'` (existing manual-patient path), and stores the allocation breakdown in that record's `metadata.allocations`.
  - Also writes the matching `finance_entries` income row so the Finances tab, charts and budgets pick it up (same shape `useRecordPayment` already uses).
  - Returns the payment id and the allocation array.
- Grants on the new function to `authenticated`.

**Frontend**
- `src/hooks/useAppointmentFinance.ts`: replace the inline insert in `recordPayment` with the RPC, add `recordPaymentForCharge(chargeId, amount, method, notes)`, expose per-charge `paid_cents` / remaining in the returned billing rows, and keep `markFullyPaid` working through the same RPC.
- New shared `RecordPaymentDialog` extracted from the existing dialog markup in `AppointmentFinancePanel.tsx` so the general and per-row buttons use one component.
- `src/components/appointments/AppointmentFinancePanel.tsx`: add a `Pay` button + remaining/status badge to each charge row; make the general action bar visible when a new `allowPayments` prop is set even if `showActions` is false (aggregate views get payments without the visit-only actions such as invoice PDF and add-charge).
- `src/hooks/useDoctorBillingAggregate.ts` and `src/hooks/usePracticeBillingAggregate.ts`: pass through `paid_cents`, expose a `recordPayment`/`recordPaymentForCharge` bound to the aggregate scope, and refresh after success.
- `src/components/doctor/DoctorFinancialStatsSection.tsx` and the clinic admin billing bar in `AdminDashboard.tsx` / `PracticePatientBalances.tsx`: enable payments on the panel and refresh their stats hooks (`useFinancialStats`, practice stats, patient balances) after a payment so KPI cards, outstanding balances and patient profiles update immediately.
- Patient-facing balance views (`PatientFinancialTab`, outstanding-balance badges) read the same ledger, so they update automatically once `paid_cents` and the payment rows exist; verify the outstanding view accounts for `paid_cents`.
- i18n: add EN/RU/UZ keys for the new labels (`payThis`, `remaining`, `partiallyPaid`, `unpaid`, `appliedTo`, unallocated-credit notice) in the `finance` and `appointments` namespaces.
