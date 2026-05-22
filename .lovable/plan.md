## Goal

Make the clinic admin dashboard actually show:
1. Billing & finance data (currently shows $0 / empty).
2. Advanced Financial KPIs (currently render literal "Title / Description / Not Available" cards in both doctor and clinic dashboards).
3. Registered patients (currently missing or showing blank rows).
4. Sweep other admin sections to wire up data that exists in the DB but is not surfaced.

## Findings (root causes)

- **Billing/Finance empty**: `usePracticeInsights` calls the `practice-insights` edge function, which only reads `billing_transactions` filtered by `practice_id`. In production the actual money lives in the `payments` table; `payments.practice_id` is `NULL`, so nothing is associated to the clinic. `get_practice_stats.total_revenue` is computed from `appointments × doctors.consultation_fee` and also returns 0 when no completed appointments exist — which then also disables `useAdvancedFinancialMetrics` (`enabled: revenue > 0`).
- **Advanced KPI cards show "Title / Description"**: `public/locales/*/dashboard.json` has placeholder values like `{ "roi": { "title": "Title", "description": "Description" } }` for every metric and for `keyInsightsTitle`. The component is wired correctly; the strings are unfilled.
- **Registered patients missing**: `fetchPatients` calls `get_practice_patients` RPC (returns `full_name`) but spreads rows without aliasing `name`. The list/search/sort code uses `p.name`, so registered patients render with blank names and get filtered out by search. The `name` alias is only added for facility/doctor-imported patients.
- **Appointments empty**: `useAdminDashboard.fetchAppointments` calls RPC `get_practice_appointments`, but that RPC does not exist in the DB (only `get_practice_*` for patients/services/staff/stats/messages). The call throws and is swallowed, so `appointments`, last-visit dates, and per-patient appointment history are all empty.
- **Payments not joined to practice**: `fetchPayments` already falls back to doctor-scoped lookup, but billing tabs (which read `usePracticeInsights`) never see those rows because the edge function ignores the `payments` table.

## Plan

### 1. Database — make practice billing/patient data resolvable
Single migration:
- Add `payments.practice_id` backfill: `UPDATE payments p SET practice_id = d.practice_id FROM doctors d WHERE p.practice_id IS NULL AND p.doctor_id = d.id`.
- Add trigger `set_payments_practice_id` on `payments` BEFORE INSERT/UPDATE that derives `practice_id` from `doctor_id` when null, so future cash/clinic payments stay linked.
- Create RPC `get_practice_appointments(p_practice_id uuid, p_limit_count int)` SECURITY DEFINER, guarded by `can_access_practice`, returning the same shape the frontend already expects (id, appointment_date, status, patient_id, doctor_id, doctor_name, patient_name, service_name, duration, notes).
- Update `get_practice_stats`: compute `total_revenue` as `SUM(payments.amount WHERE practice_id = p_practice_id AND status IN ('paid','completed','succeeded'))` falling back to the appointment×fee estimate when there are no payment rows.

### 2. Edge function `practice-insights`
- For `action="billing"`, also pull rows from `payments` filtered by `practice_id` (and by `doctor_id IN (...)` for legacy rows), normalize them into the same `BillingTx` shape (`amount_cents = amount*100`, `provider = payment_method`, `status` mapped to `completed|pending|refunded`), and merge with `billing_transactions` before computing summary/recent.
- For `action="analytics"`, fold those normalized payment rows into the revenue totals.

### 3. Frontend hook — `useAdminDashboard`
- In `fetchPatients`: alias every source to `{ name: full_name || name }` and ensure registered (RPC) rows are pushed with `name`, `phone`, `email`, `last_visit`, `doctor_name` preserved. Keep dedupe by `user_id || id`.
- Don't drop registered patients when `patientStatusFilter='all'` (already fine) — also make the patient cards/table use `p.name || p.full_name`.
- Remove the broken `get_practice_appointments` RPC call's silent failure: once the RPC exists (step 1) appointments will populate; until then, fall back to a direct `appointments` select scoped by `practice_id` joined to `profiles` and `doctors`.

### 4. Advanced KPI cards
- Fill `public/locales/en/dashboard.json` `doctor.performance.advancedFinancial.metrics.*` with real titles + descriptions for: roi, roas, adRevenueCost, workingCapital, workingCapitalRatio, netProfitMargin, grossProfitMargin, ebitda, breakEvenUnits, revenueRunRate, cac, ltv, cacToLtv — plus `keyInsightsTitle`, `configureInputs`, top-level `title` and `description`. Mirror minimal English fallbacks for the other 10 locale files (use the English copy so cards render meaningfully even before professional translation).
- In `useAdvancedFinancialMetrics`, relax `enabled: !!targetEntityId && revenue > 0` to `enabled: !!targetEntityId` so the cards still render (with "Not Available" placeholders) when revenue is zero but the user wants to fill inputs.
- In `AdminDashboard.tsx` advanced metrics block: also call `refreshAdvancedMetrics` after `FinancialInputsModal` saves, and pass `revenue` from the practice-insights billing summary (`totalRevenueCents/100`) rather than only `stats.totalRevenue`, so the KPI math reflects real cash flow.

### 5. Other admin sections — connect existing data
- **Overview**: when `payments` data is available, show real revenue chart from billing summary instead of empty placeholder.
- **Providers tab**: `fetchDoctors` already hydrates from `doctor_profiles_view`; verify the per-doctor "patients" and "financial" sub-tabs use `payments` joined by `doctor_id` (currently relies on `billing_transactions` only — switch to merged source from step 2's helper).
- **Billing → Invoices/Transactions**: render rows from the merged transactions list returned by `practice-insights` (now including `payments`).
- **Billing → Superbills (insurance)**: leave UI as-is, persistence already goes through `entitySettings`.
- **Finance section**: `useFinanceEntries`/`useFinanceCategories` already accept `practice` entity — verify they render when `practice.id` is set; no code change expected, just smoke test after data is connected.

### 6. Verification
- Run `bun run build` / Vite check.
- Manually load `/dashboard` as a clinic admin for a practice with `payments` rows: confirm Billing KPIs, Patients list, Advanced KPI titles all populate.
- Re-check `/dashboard` as a doctor: KPI cards now show real labels instead of "Title / Description".

## Technical notes

- New RPC and trigger live in a single migration file.
- The `practice-insights` edge function update is backwards compatible (existing `billing_transactions` consumers keep working).
- No schema-breaking changes; only additive backfill and one new column-derivation trigger.
- i18n updates touch only the `dashboard` namespace, key path `doctor.performance.advancedFinancial.*`.

