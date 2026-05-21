## Plan

**Problem**
The doctor's patient list (`doctor_patients` table) is invisible to the clinic admin because RLS only allows the doctor themselves to SELECT/UPDATE these rows. `useAdminDashboard.fetchPatients` already queries `doctor_patients` for every doctor of the practice, but RLS silently returns 0 rows. Also, when a doctor leaves a practice (their `doctors.practice_id` is cleared), their patients should no longer appear in the clinic admin dashboard.

**Solution — RLS only, no UI changes needed**

Add scoped RLS policies on `public.doctor_patients` using the existing `can_access_practice(uuid)` security‑definer helper:

1. **SELECT** — practice admin / staff can view a `doctor_patients` row when the linked doctor still belongs to a practice they can access:
   ```
   EXISTS (
     SELECT 1 FROM public.doctors d
     WHERE d.id = doctor_patients.doctor_id
       AND d.practice_id IS NOT NULL
       AND public.can_access_practice(d.practice_id)
   )
   ```
2. **UPDATE** — same predicate for `USING` and `WITH CHECK`, so the admin can edit phone/email/status/allergies (already used in `AdminDashboard.tsx`).

Skip INSERT/DELETE policies; admins create patients through `facility_patients` and shouldn't hard-delete doctor-owned records.

**Automatic "lose access when doctor leaves"**
Because the predicate filters on `doctors.practice_id`, the moment a doctor's `practice_id` is set to NULL (or changed to another practice), their patients disappear from the original clinic admin dashboard. No extra cleanup needed.

**Verification**
- Sign in as clinic admin → Patients tab now lists patients added directly by joined doctors.
- Remove a doctor from the practice → those patients vanish from the admin list on next fetch.
- Doctor's own patient view (`useDoctorPatientsV2`) keeps working unchanged.