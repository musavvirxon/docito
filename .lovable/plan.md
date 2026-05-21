## Plan

1. **Fix the actual RLS failure in the modal**
   - `get_practice_providers()` returns provider rows with `id`, but `AddServiceModal` reads `doctor_id`.
   - Because of that mismatch, the insert request sends no `dentist_id`, so Supabase rejects the row with `new row violates row-level security policy`.
   - Update the modal provider type and checkbox handling to use the returned `id`, and insert it as `dentist_id`.

2. **Fix related dashboard service loading bug**
   - `useAdminDashboard.ts` currently queries `procedures` with `.in("doctor_id", ids)`, but the table column is `dentist_id`.
   - Change this to `.in("dentist_id", ids)` and group results by `dentist_id`, so services created for clinic doctors show correctly afterward.

3. **Handle clinic locations correctly without weakening security**
   - The current `procedures` table has no `location_id` column and no service-location join table, so the location checkboxes are currently not saved anywhere.
   - For this fix, keep the secure doctor-based insert working first.
   - If location-specific services are required, add a follow-up migration for a dedicated `procedure_locations` join table protected by `can_access_practice(...)`, then update the modal to save selected locations there.

4. **Verify after implementation**
   - Confirm the POST body includes `dentist_id`.
   - Confirm the request no longer triggers the RLS error for a clinic admin adding a service to a joined doctor.
   - Confirm the admin dashboard reads services using `dentist_id` instead of the non-existent `doctor_id` column.