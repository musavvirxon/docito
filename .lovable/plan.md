# Fix Plan: Patient Dashboard, Search, Booking, and Appointments

## Issues Identified

1. `**patient_all_appointments` query fails** -- trying to join `procedure:procedure_id(*)` but the view has no FK to `procedures`. Returns 400 error.
2. `**appointment_holds.procedure_id` does not exist** -- the `book-appointment` edge function tries to insert `procedure_id` into `appointment_holds`, and `BookingConfirmation.tsx` selects it. The column doesn't exist in the table schema.
3. **Doctor name missing in search results** -- `useDoctorSearch.ts` queries `profiles!fk_doctors_user_id(full_name, avatar_url)` but network responses show `profiles: null`. The profiles RLS blocks access. Need to use `doctor_profiles_view` instead.
4. **Doctor name missing in DoctorProfile page** -- Uses `profiles:user_id(...)` which also fails due to RLS. Same fix needed.
5. **Doctor name missing in BookingModal/DoctorProfileModal** -- These modals receive doctor data from the search hook which already has null profiles.
6. **Translations not showing** -- `ResultCard.tsx` uses `useTranslation("dashboard")` but translation keys like `patient.resultCard.doctor` exist in `dashboard.json`. The issue is the search results page (`SearchDoctors.tsx`) uses `useTranslation('doctors')` namespace, and the result cards use `dashboard` namespace. Both should work. Need to check if the patient dashboard itself renders untranslated code strings.
7. **Procedures only visible for dentists** -- The `isDentist` check limits procedure selection. Should be available for all doctors.
8. **Patient details section in booking** -- Should be removed; patient data from profile is sent automatically.
9. **Payment/cost should be charged only after doctor confirms** -- Cost display should show "Estimated" and note payment is post-appointment.
10. While booking appointment doctor profile should be showed when clicked on profile button - all public info should be displayes.
11. Booking-confirmation page should be fixed

## Changes

### 1. Fix `patient_all_appointments` query (supabase-api.ts + usePatientDashboard.ts)

Remove the `procedure:procedure_id(*)` join from the `patient_all_appointments` query since the view doesn't have this FK relationship.

**Files**: `src/lib/api/supabase-api.ts` (line 510), `src/hooks/usePatientDashboard.ts` (lines 44-64)

Remove `, procedure:procedure_id (*)` from the select string. Keep the doctor and practice joins.

### 2. Add `procedure_id` column to `appointment_holds` (SQL migration)

```sql
ALTER TABLE public.appointment_holds 
ADD COLUMN IF NOT EXISTS procedure_id uuid REFERENCES procedures(id);
```

This fixes:

- The `book-appointment` edge function insert
- The `BookingConfirmation.tsx` select

### 3. Fix doctor name in search results (useDoctorSearch.ts)

Replace `profiles!fk_doctors_user_id(full_name, avatar_url)` with a separate query to `doctor_profiles_view` or use the view directly. The simplest fix: query `doctor_profiles_view` instead of `doctors` table, since the view already includes `full_name` and `avatar_url`.

**File**: `src/hooks/useDoctorSearch.ts`

Change the query to use `doctor_profiles_view` which bypasses profiles RLS:

```ts
let q = supabase
  .from('doctor_profiles_view')
  .select('id, specialty, consultation_fee, accepts_new_patients, average_rating, num_reviews, consultation_types, verified, full_name, avatar_url')
  .eq('verified', true)
  .limit(50);
```

Update the mapping to use `d.full_name` directly instead of `d.profiles?.full_name`.

### 4. Fix doctor name in DoctorProfile page

**File**: `src/pages/DoctorProfile.tsx`

After fetching from `doctors` table, hydrate the name from `doctor_profiles_view` if `profiles` is null (RLS blocked). Add a fallback fetch:

```ts
if (!data.profiles || !data.profiles.full_name) {
  const { data: dpv } = await supabase
    .from('doctor_profiles_view')
    .select('full_name, avatar_url')
    .eq('id', data.id)
    .maybeSingle();
  if (dpv) {
    data.profiles = { ...data.profiles, full_name: dpv.full_name, avatar_url: dpv.avatar_url };
  }
}
```

### 5. Fix doctor name in BookingModal and DoctorProfileModal

These receive `doctor` prop from `SearchDoctors.tsx`. The search results already map `name` from `profiles.full_name`. With fix #3, the name will be populated correctly. No additional changes needed for these modals.

### 6. Make procedures available for all doctors (not just dentists)

**File**: `src/pages/AppointmentBooking.tsx`

- Remove the `isDentist` check that gates the procedures section (line 547: `{isDentist && (`)
- Change it to always show if procedures exist
- Update procedure loading to use `doctor_id` instead of `dentist_id` for non-dentist doctors (check both columns)

### 7. Remove patient details section from booking

**File**: `src/pages/AppointmentBooking.tsx`

- Remove the "Patient details" Card (lines 708-756) containing name/email/phone inputs
- Keep only the Notes textarea
- Remove `patientName`, `patientEmail` state variables
- Keep `patientPhone` but auto-fill from profile (already done) and don't show input
- Update `canBook` to not require phone: `const canBook = Boolean(selectedSlotStart) && !booking`
- Update `handleBook` to pull patient info from auth/profile automatically
- In `combinedNotes`, remove the manual name/email/phone lines

### 8. Update cost/payment messaging

**File**: `src/pages/AppointmentBooking.tsx`

- Change consultation fee display to say "Estimated fee" 
- Add note: "Payment will only be charged after appointment completion and doctor confirmation"
- In the procedure cost display, change "Estimate:" label to "Estimated cost (charged after appointment):"

### 9. Fix patient dashboard translations

The `ResultCard.tsx` uses `useTranslation("dashboard")` which loads `public/locales/en/dashboard.json`. The keys like `patient.resultCard.doctor` exist there, so translations should work. The issue may be that the patient dashboard components themselves show raw keys. Need to verify the patient dashboard view uses the correct translation namespace.

**File**: `src/components/patient-dashboard/PatientDashboardView.tsx` - verify it uses `useTranslation("dashboard")`

## Summary of Changes


| File                                | Change                                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| SQL migration                       | Add `procedure_id` column to `appointment_holds`                                          |
| `src/lib/api/supabase-api.ts`       | Remove `procedure:procedure_id(*)` from `patient_all_appointments` query                  |
| `src/hooks/usePatientDashboard.ts`  | Remove procedure join from query                                                          |
| `src/hooks/useDoctorSearch.ts`      | Use `doctor_profiles_view` instead of `doctors` table for search                          |
| `src/pages/DoctorProfile.tsx`       | Add fallback name hydration from `doctor_profiles_view`                                   |
| `src/pages/AppointmentBooking.tsx`  | Remove patient details section, show procedures for all doctors, update payment messaging |
| `src/pages/BookingConfirmation.tsx` | No change needed (procedure_id column fix handles it)                                     |
