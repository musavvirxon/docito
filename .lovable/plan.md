## Why the Foe Foe dashboard is empty

Verified directly in the database for practice `554c8b46…` (Foe Foe / Test Clinic) and doctor Dentist Hi `8fcfe750…`:

```
doctors WHERE practice_id = Foe Foe         → 0
doctors WHERE id = Dentist Hi               → 1, but practice_id IS NULL
appointments WHERE practice_id = Foe Foe    → 0
appointments WHERE doctor_id = Dentist Hi   → 28
billing_transactions WHERE practice_id      → 0
practice_join_requests (doctor → Foe Foe)   → status = "accepted"
```

So the join request was accepted, but **`doctors.practice_id` was never set** — there is no trigger on `practice_join_requests` that links the doctor to the clinic. Every dashboard query (`get_practice_providers`, `get_practice_appointments`, payments, patients) filters by `practice_id`, so all of them return zero.

Two extra bugs amplify the issue:
- `get_practice_services` RPC selects `procedures.created_by`, which does not exist → HTTP 400 every page load (visible in the network log).
- `useAdminDashboard.fetchAppointments` only fetches 10 rows, and the custom report builder ignores its From/To date range.

## Plan

### 1. Migration — link doctors to practices on join

- **Backfill now**: `UPDATE doctors d SET practice_id = jr.practice_id, practice_location_id = COALESCE(d.practice_location_id, jr.location_id) FROM practice_join_requests jr WHERE jr.doctor_id = d.id AND jr.status = 'accepted' AND d.practice_id IS NULL;`
- **Backfill historical rows so they show up under the new link**:
  - `UPDATE appointments a SET practice_id = d.practice_id FROM doctors d WHERE a.doctor_id = d.id AND a.practice_id IS NULL AND d.practice_id IS NOT NULL;`
  - `UPDATE billing_transactions bt SET practice_id = a.practice_id FROM appointments a WHERE bt.appointment_id = a.id AND bt.practice_id IS NULL AND a.practice_id IS NOT NULL;`
- **Trigger on `practice_join_requests`**: when row transitions to `status = 'accepted'`, set `doctors.practice_id` / `practice_location_id` (if null), and also stamp existing `appointments` / `billing_transactions` for that doctor with the practice_id (only where null, so independent-practice history isn't hijacked retroactively for other clinics).
- **Trigger on `appointments` BEFORE INSERT/UPDATE**: if `practice_id IS NULL` and the doctor has one, copy it. Keeps future bookings tagged.
- **Trigger on `billing_transactions` BEFORE INSERT**: if `practice_id IS NULL` and `appointment_id` is set, copy from the appointment. Keeps future charges tagged.

### 2. Fix the broken services RPC

Replace `get_practice_services` so it doesn't reference the non-existent `procedures.created_by`. Join `procedures` → `doctors` via `procedures.doctor_id` (or just by `procedures.practice_id`), and return the same columns the UI expects (`id, name, doctor_name, price, duration_minutes, category`). This stops the 400 on every dashboard load.

### 3. Fix the custom report builder (`AdminDashboard.tsx` ~5508)

- Remove the `p_limit_count: 10` cap in `useAdminDashboard.fetchAppointments` (pass 5000, or no limit) — otherwise the report only sees the most recent 10 rows even when data exists.
- Apply `reportFrom` / `reportTo` to `filteredAppts` using `a.appointment_date` — currently the date inputs are decorative.
- Match provider/service by id as well as by name so the filters actually engage.
- Compute Total Revenue from the now-filtered `payments` list (sum of `amount_cents` over matching `appointment_id`s / date range) rather than the global summary, so the filters move the number.

### 4. Verify

After approval and migration run:
- `SELECT count(*) FROM appointments WHERE practice_id = '554c8b46…';` should be 28.
- Reload `/practices/dashboard` as Foe Foe: Providers shows Dentist Hi, Appointments tab shows the 28 entries, Financial tab shows the paid/unpaid totals, Reports → Generate returns non-zero metrics that respond to the date filter.

### Files

- `supabase/migrations/<new>.sql` — backfill + 3 triggers + replacement `get_practice_services`
- `src/hooks/useAdminDashboard.ts` — drop the 10-row appointment cap
- `src/pages/AdminDashboard.tsx` — apply date range & id-based filters in the report generator

No new tables, no RLS changes, no UI redesign — just connects the existing widgets to the real data and prevents the same disconnect for future joins.
