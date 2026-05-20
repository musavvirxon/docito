# Surface joined-doctor data inside clinic admin profile

The clinic admin already loads the right doctor row (`Dentist Hi`, 28 appointments tagged to Foe Foe), but four tabs of the provider drawer are empty because they read sources that don't exist or aren't wired up. This plan fills in the gaps without touching the doctor's own dashboard.

## What's wrong today

- **Working Hours** card is always "Closed" — `fetchDoctors` reads `doctor_availability`, a table that doesn't exist. The real source is `public.schedule_settings.working_days` (JSONB keyed by weekday) plus `holidays` and `buffer_time`.
- **No Financial tab** in the provider drawer at all — clinic admin can't see Total Earnings / This Month / Unpaid / Net / Pending Payments / by-service breakdown for the joined doctor.
- **No Past Appointments** view — Calendar tab only shows Upcoming. The 28 historical appointments aren't reachable from the provider profile.
- **Patients tab / Analytics tab** numbers do work off `providerAppointments`, but they're paired with the broken Working Hours / missing Financial, so the profile feels empty.

## Changes (frontend only, no migrations)

1. **`src/hooks/useAdminDashboard.ts` – `fetchDoctors`**
   - Replace the `doctor_availability` call with `schedule_settings` (`doctor_id IN (ids)`), keep the result on the doctor as `schedule` `{ working_days, buffer_time, holidays }`. Drop the broken `availability` field.

2. **`src/pages/AdminDashboard.tsx` – Calendar tab (`providerTab === 'calendar'`)**
   - Rewrite "Working Hours" to read `selectedProvider.schedule.working_days` (JSON shape: `{ monday: { enabled, start_time, end_time, breaks:[{start_time,end_time,name}] }, … }`). Show Open/Closed badge, hours range, and lunch break note per day.
   - Add a "Holidays" mini-list under Working Hours when `schedule.holidays` is non-empty.
   - Add a "Past Appointments" card under Upcoming, showing the last 25 `providerAppointments` with `appointment_date < today`, sorted desc — date, patient, service, status.

3. **`src/hooks/useFinancialStats.ts`**
   - Accept an explicit `doctorId` argument (`useFinancialStats(dateFrom?, dateTo?, doctorIdOverride?)`). When provided, skip the session-based lookup and use it directly. No other behavior change — keeps the doctor dashboard identical.

4. **`src/pages/AdminDashboard.tsx` – new Financial provider tab**
   - Add `'financial'` to `providerTab` union and to `providerTabs` (label from `t("admin.providers.tabs.financial", { defaultValue: "Financial" })`).
   - New `{providerTab === 'financial' && …}` block (mirrors the doctor's FinancialOverview layout, read-only):
     - 4 KPI cards: Total Earnings, This Month, Unpaid, Net Earnings (after 15%).
     - Payout info row: Payouts Processed, Next Payout, Platform Commission.
     - Earnings-over-time area chart.
     - "By Service" and "Pending Payments" tables.
   - Data source: `useFinancialStats(undefined, undefined, selectedProvider.id)` so the hook is scoped to the selected doctor regardless of who's logged in. This works for the clinic admin because all underlying queries (`appointments`, `procedures`, `appointment_procedures`, `tooth_procedure_history`, `payments`) are already readable to the practice admin via existing RLS for rows tagged with the practice.

5. **i18n** — add fallback `defaultValue` strings inline (`Financial`, `Past Appointments`, `Holidays`, `Working Days`) so the feature works in every locale without new namespace edits.

## Out of scope

- No SQL migrations, no RLS changes, no edits to the doctor's own dashboard, no changes to `useAdminDashboard.fetchPatients`/`fetchAppointments` (the data they pull is already correct — 28 appointments are tagged to the practice, the doctor patient is fetched).
- "Performance info" (completion / cancellation / utilization) is already rendered in the existing Analytics tab off `providerAppointments`; it will populate automatically once the empty profile feels alive again. No code change needed there.

## Verification

- As Foe Foe admin, open Providers → Dentist Hi:
  - Overview / Analytics: appointment counts and Patients Seen > 0.
  - Calendar: Mon–Fri Open with the schedule_settings hours, Sat/Sun Closed, lunch break shown, 2 holidays listed, Past Appointments populated.
  - Financial: Total Earnings, This Month, Unpaid, Pending Payments table all populated from the doctor's appointments/procedures.
