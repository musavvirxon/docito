# Doctor Payments tab (commission vs. room rent settlements)

Add a new **Doctor Payments** tab to the Finance page that shows, per doctor and per period, what the clinic owes them in commission, what they owe the clinic in room rent, and the net — with a "Mark as settled" action that keeps history.

## What the user sees

A new sidebar item **Doctor Payments** on `/finance`, between Payroll and Analytics, with:

1. **Period selector** — month picker (default: current month), with the resolved start/end shown.
2. **Settlement table** — one row per doctor who has a rent profile and/or an active percentage compensation profile:
   - Doctor name
   - Commission basis (collected revenue in the period) and rate
   - Commission owed
   - Room + rent owed for the period
   - Net, rendered as "Clinic owes Dr. X 10 000" (positive) or "Dr. X owes clinic 50 000" (negative)
   - Status badge (Pending / Settled) + **Mark as settled** button
3. **Room rent profiles card** — list of rent profiles with an add/edit form styled like `CompensationManager`'s dialog: doctor select, room select (from `clinic_rooms`), amount, frequency (monthly/weekly/daily), effective from, notes, active toggle.
4. **Commission profiles** — reuses the existing `CompensationManager` component inline (same `{ entityType, entityId }` props), so there is exactly one commission system.

Acceptance cases from the request are the two shapes the table must produce: rent-only doctor shows a negative net (owes clinic), percentage-only doctor with collections shows a positive net (clinic owes).

## Technical details

### Database (one migration)

`public.doctor_room_rent_profiles`
- `id uuid pk default gen_random_uuid()`, `entity_type text not null`, `entity_id uuid not null`, `user_id uuid not null` (doctor's auth user id, matching `staff_compensation_profiles.user_id`), `room_id uuid null references public.clinic_rooms(id) on delete set null`, `rent_amount_cents bigint not null default 0`, `rent_frequency text not null default 'monthly'` (monthly|weekly|daily), `effective_from date not null default current_date`, `is_active boolean not null default true`, `notes text`, `created_by uuid`, `created_at timestamptz default now()`.

`public.doctor_settlement_records`
- `id`, `entity_type`, `entity_id`, `user_id`, `period_start date`, `period_end date`, `commission_owed_cents bigint default 0`, `rent_owed_cents bigint default 0`, `net_cents bigint default 0`, `status text default 'settled'`, `settled_at timestamptz default now()`, `settled_by uuid`, `notes text`, `created_at timestamptz default now()`, unique on `(entity_type, entity_id, user_id, period_start, period_end)`.

Both tables follow the `staff_compensation_profiles` pattern exactly:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;
GRANT ALL ON public.<table> TO service_role;
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
-- ALL: practices.admin_id = auth.uid() for entity_id, OR has_role(auth.uid(),'super_admin')
-- SELECT: user_id = auth.uid()  (doctor self-view)
```
No `anon` grant — every policy is scoped to an authenticated identity.

### Units and id mapping (the two easy bugs here)

- Rent and compensation amounts are **cents**; `collectedInRange()` returns **major units**. Convert collected to cents once (`Math.round(collected * 100)`) and do all arithmetic in cents; format at render only.
- `staff_compensation_profiles.user_id` and the new rent profiles hold the **auth user id**, but `fetchDoctorCollections(doctorId)` queries `payments.doctor_id` / `billing_transactions.doctor_id`, which store **`doctors.id`** (verified: all 18 payment rows join on `doctors.id`, none on `doctors.user_id`). The panel loads `doctors (id, user_id, practice_id)` for the entity and maps `user_id -> doctors.id` before calling `fetchDoctorCollections`. A doctor with no `doctors` row gets 0 collected rather than a wrong number.
- `clinic_rooms.primary_doctor_id` also stores `doctors.id`, so the room dropdown labels use the same map.
- Rent for the period = the active profile's amount normalised to the selected period: monthly -> amount as-is for a whole month; weekly/daily -> amount x number of weeks/days in the period. Profiles whose `effective_from` is after the period end are excluded.
- Commission owed = `collectedCents * percentage_rate / 100`, only for active `compensation_type = 'percentage'` profiles. `percentage_of` values other than `doctor_revenue` are still computed off collected revenue for now, with the basis label shown in the row so it's not silently wrong.

### Files

- `src/components/financial/DoctorSettlementsPanel.tsx` (new) — props `{ entityType, entityId }`; loads doctors, rent profiles (new hook `useDoctorRentProfiles`, mirroring `useCompensationProfiles`), compensation profiles via `useCompensationProfiles`, collections via `fetchDoctorCollections` + `collectedInRange`, existing settlement records for the period; renders the table, the rent form dialog, and `CompensationManager`.
- `src/hooks/useDoctorRentProfiles.ts` (new) — copy of `useCompensationProfiles`' shape/query pattern for the new table.
- `src/pages/FinanceDashboard.tsx` — add `"doctor-payments"` to the `FinanceTab` union, to `sidebarItems` (Handshake icon), to the URL tab-sync `ok` array, and an `activeTab === "doctor-payments"` render block with the same "Select an organization" fallback card the sibling tabs use.
- `public/locales/{en,ru,uz}/dashboard.json` — keys for the tab label and panel labels, read with `useTranslation('dashboard')` as the page already does.

### Out of scope

`CompensationProfileDialog.tsx`, `CompensationProfilesPanel.tsx`, and `src/components/finance/FinanceHub.tsx` are left untouched.
