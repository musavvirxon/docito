# My Payments (doctor) + admin-approved payment log

Give doctors a finance view of their own arrangement, let them log payments they made or received, and let clinic admins approve or reject those logs.

## What the doctor sees

New sidebar item **My Payments** in the doctor dashboard (both independent and practice sidebars), placed next to Financial Stats:

1. **Summary cards** (read-only)
   - Active rent obligation: amount + frequency + room, from their active rent profile.
   - Active commission rate: percentage + basis, from their active percentage compensation profile.
   - Current-period net settlement, if the admin has recorded one.
2. **Settlement history** — table of their settlement records (period, commission owed, rent owed, net, status), newest first.
3. **Log a payment** button — small dialog: type (Rent paid / Commission received), amount, optional period (month picker), optional note. Submits with status Pending.
4. **My submissions** — list of their own submissions with a status badge (Pending / Approved / Rejected). Rejected rows show the admin's review note.

All three reads are filtered to the signed-in user; existing self-view policies on the rent, compensation and settlement tables already restrict rows to the doctor themselves (verified).

## What the admin sees

In the existing **Doctor Payments** tab (Finance page), a new **Pending approvals** card above the settlement table: doctor name, type, amount, period, note, submitted date, plus **Approve** and **Reject** buttons. Reject opens a small prompt requiring a short reason, stored as the review note. Approving or rejecting stamps the reviewer and time.

Pending submissions are not counted in any settlement math or "amount paid" total anywhere in the app — this table stays a standalone approval log. Approved rent submissions are not auto-merged into settlement records; "Mark as settled" remains the manual action.

## Technical details

### Migration — `public.doctor_payment_submissions`

Columns: `id uuid pk default gen_random_uuid()`, `entity_type text not null`, `entity_id uuid not null`, `user_id uuid not null`, `payment_type text not null check in ('rent_payment','commission_received')`, `amount_cents bigint not null`, `period_start date null`, `period_end date null`, `note text`, `status text not null default 'pending' check in ('pending','approved','rejected')`, `reviewed_by uuid`, `reviewed_at timestamptz`, `review_note text`, `created_at timestamptz not null default now()`.

Grants and RLS (no `anon` grant; every policy is scoped to an authenticated identity):

```sql
GRANT SELECT, INSERT, UPDATE ON public.doctor_payment_submissions TO authenticated;
GRANT ALL ON public.doctor_payment_submissions TO service_role;
ALTER TABLE public.doctor_payment_submissions ENABLE ROW LEVEL SECURITY;
```

Policies — deliberately no doctor UPDATE and no `FOR ALL` policy:

- `INSERT` (authenticated): `WITH CHECK (user_id = auth.uid() AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND review_note IS NULL)` — a doctor's insert can never land in any state other than pending.
- `SELECT` (authenticated): `user_id = auth.uid()` — own rows only.
- `SELECT` (authenticated): `public.can_access_entity(entity_type, entity_id)` — admins/staff of the entity see all rows for it.
- `UPDATE` (authenticated): `USING (public.can_access_entity(entity_type, entity_id)) WITH CHECK (public.can_access_entity(entity_type, entity_id))` — admins only. A `BEFORE UPDATE` trigger (`SECURITY DEFINER`, pinned `search_path`) rejects changes to `entity_type`, `entity_id`, `user_id`, `payment_type`, `amount_cents`, `period_start`, `period_end`, `note` and `created_at`, so the admin path can only move status/reviewed_by/reviewed_at/review_note. Since a doctor matches no UPDATE policy, they cannot flip their own status.

### Files

- `src/hooks/useDoctorPaymentSubmissions.ts` (new) — mirrors `useDoctorRentProfiles`; two modes: by `userId` (doctor view) and by `{entityType, entityId}` (admin view), plus `submit`, `approve`, `reject` helpers.
- `src/hooks/useMyDoctorFinance.ts` (new) — loads the signed-in user's active rent profile, active percentage compensation profile and settlement records.
- `src/components/doctor/MyPaymentsSection.tsx` (new) — the doctor-side section: summary cards, settlement history, log-payment dialog, submissions list. Entity scoping for the insert is derived from the doctor's own rent/compensation profile row, falling back to their `doctors.practice_id` with `entity_type = 'practice'`; when neither exists the log button is disabled with an explanatory empty state.
- `src/pages/DoctorDashboard.tsx` — add `my-payments` to both `sidebarItems` arrays (Wallet icon) and a `case "my-payments"` render block.
- `src/components/financial/DoctorSettlementsPanel.tsx` — add the Pending approvals card and reject-reason dialog, reusing the existing doctor-name map and currency formatter.
- `public/locales/{en,ru,uz}/dashboard.json` — keys for the section title, card labels, form fields, statuses and toasts, read via `useTranslation('dashboard')`.

### Out of scope

Settlement math, `useCompensationProfiles`, `CompensationManager`, and the Finance page tab list stay untouched.
