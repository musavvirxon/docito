## Findings

- `get_practice_appointments()` is currently failing in the database because it returns `varchar` profile names where the function promises `text`. The hook catches that error and sets `appointments` to `[]`, so Analytics and Reports show zeros.
- The current appointment RPC only returns display fields. Analytics needs stable IDs like `doctor_id`, `patient_id`, `practice_id`, `appointment_type`, `procedure_id`, and `created_at` to filter and join correctly.
- The `payments` table has a real paid row for Dentist hi, but `useAdminDashboard()` only reads `billing_transactions`, and in this case `billing_transactions` has no rows.
- The visible database rows for Dentist hi show many appointments in the selected date range, but their statuses in the database are currently `confirmed` for the last 30–90 days. `completed` and `canceled` rows exist older than that. I’ll still fix the dashboard wiring so it shows the actual statuses present instead of zeros.

## Implementation plan

1. **Fix secure appointment visibility for clinic admins**
   - Add a migration to replace `get_practice_appointments()` with a `SECURITY DEFINER` RPC that:
     - authorizes practice admin, active clinic/practice staff, or super admin;
     - returns real appointment rows for the practice;
     - casts names to `text` so the RPC no longer crashes;
     - includes `doctor_id`, `patient_id`, `practice_id`, `appointment_type`, `procedure_id`, and `created_at`.
   - Add/adjust safe appointment read policy for practice admins so direct practice-scoped queries used by metrics are also allowed.

2. **Fix patient and payment hydration in `useAdminDashboard()`**
   - Read appointments from the repaired RPC and keep the new IDs in state.
   - Combine `billing_transactions` and `payments` into one normalized payments array.
   - Include rows from `payments` when they match the practice directly, the appointment’s practice, or a joined doctor in the practice.
   - Normalize cents/amount fields so financial KPIs and reports calculate consistently.

3. **Make Analytics and Reports filter by IDs instead of fragile names**
   - Use `doctor_id` for provider filters and comparisons.
   - Keep display names only for labels.
   - Normalize appointment statuses so `canceled` and `cancelled` are counted together, and `no_show` / `no-show` are counted together.
   - Make generated report metrics use the same filtered appointment/payment collections as the analytics cards.

4. **Verify against the Dentist hi / Test Clinic case**
   - Confirm the repaired RPC returns Dentist hi’s appointments for practice `554c8b46-937e-4117-a19f-a4c600031840`.
   - Confirm the dashboard report for the same date/provider no longer shows all zeros and reflects the real `confirmed`, `completed`, `canceled`, and payment rows available in the database.