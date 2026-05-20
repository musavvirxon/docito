# Wire all data in clinic admin Analytics

The Analytics section (`/practices/dashboard` → Analytics) has 7 tabs. Most read the real data hooks, but several widgets are stubbed, hard-coded, or read fields that don't exist on our rows. This plan replaces every stub with live data and makes inert controls functional. Frontend only — no migrations.

## Fixes per tab

### Overview
- Remove the duplicated "Range" line in the Summary card (line 5237 is a leftover copy of 5236).

### Appointments
- **Booking Source card** currently reads `a.source || a.booking_source` (fields that don't exist) so every row falls into "Unknown". Replace with `appointment_type` (in_person / video / phone / home_visit) which actually exists on appointment rows, and relabel the card to "Appointment Type". Keep the empty state.

### Providers
- **Provider Comparison** is a dead UI — two `<select>` with `defaultValue=""` and no state. Wire it:
  - Add `compareA` / `compareB` state in the page component.
  - When both selected, render a side-by-side stat block from the already-computed `providerStats` (Total, Completed, Cancelled, Unique Patients, Completion %, Cancellation %, Rating).
  - Add a Clear button.

### Patients
- **Active (90d) / Inactive (90d+)** are wrong because `p.last_visit` is never populated on most patient sources. Compute a real `lastVisitByPatient` map from `appointments` (`patient_id` and falling back to `patient_name`) once at the top of the section, then use it for the KPIs, the Inactive table, and the Top Patients table (replacing the `p.last_visit || p.updated_at` heuristic).
- Inactive table: only show patients we have an identifier for (skip `appointments-only` rows that have no real PII).

### Financial
The whole tab depends on `billing.summary` / `billing.transactions` from the `practice-billing` edge function. For practices whose payments live in `payments` (not `billing_transactions`), every number is 0 or placeholder. Switch the tab to a unified derivation that prefers the already-loaded `payments` array (from `useAdminDashboard.fetchPayments`) and falls back to `billing.summary` when populated:
- **KPI cards** — derive totals from `payments`: Total Revenue (sum of paid/succeeded), Pending (sum of pending), Refunds (refunded), Transactions (paid count). Keep `billing.summary` as fallback.
- **Revenue Trend** — group paid `payments` by `created_at.slice(0,7)`.
- **Revenue by Provider** — currently hard-coded `$0.00`. Build a `paymentsByApptId` map, join to `appointments[].doctor_id/name` to get per-doctor totals, render with real Progress bars and a sort by revenue desc.
- **Payment Method Breakdown** — reads `tx.payment_method` which our schema doesn't have; switch to `payments[].provider` (stripe / cash / etc.) and fall back to `billing_transactions[].provider`.
- **Average Revenue per Appointment** — use the unified Total Revenue / completed-appointment count.

### Services
- Already wired against real `appointments` + `services`. No change.

### Reports
- Already wired in the previous turn. No change.

## Files

- `src/pages/AdminDashboard.tsx`
  - Add state: `compareA`, `compareB` (strings).
  - Edit analytics blocks: overview duplicate line, appointments booking-source card, providers comparison block, patients last-visit derivation + KPIs, full financial tab body.
- No new files, no hook changes (the financial fix consumes the existing `payments` state surfaced by `useAdminDashboard`).

## Out of scope

- No edits to the per-provider drawer (already wired in the previous turn).
- No new edge functions, no RLS or migration work — all data is already fetched and readable for the practice admin.
- No i18n key changes; use inline `defaultValue` strings for the new labels (Appointment Type, Compare, Clear, etc.).

## Verification

As Foe Foe clinic admin → Analytics:
- Overview: only one Range row shown.
- Appointments: "Appointment Type" card lists in_person/video counts from real data.
- Providers: pick Dentist Hi in column A and another doctor (or itself) in column B — side-by-side stats render.
- Patients: Active/Inactive split reflects actual recent appointment dates; inactive list shows real patients with their true last visit.
- Financial: Total Revenue, Revenue Trend, Revenue by Provider, Payment Method, and Avg per Appointment all populated from `payments` rows.
