## Fix 4 issues on the practice dashboard

### 1. Diagnoses only appear after adding a new one

**Root cause:** In `src/hooks/useDoctorIntegration.ts`, `refreshAllData` calls `fetchDoctorProfile()` then `fetchDiagnoses()` (and siblings) in parallel. Each of those fetchers is a `useCallback` closed over the `doctorProfile` state, and they early-return when `doctorProfile` is still `null`. React hasn't re-rendered between `setDoctorProfile(data)` and the follow-up calls in the same tick, so the closure still sees `null` and the fetch is skipped. Once the user adds a diagnosis later, `doctorProfile` is populated, the closure is fresh, and the list finally loads.

**Fix:** Use the profile returned from `fetchDoctorProfile()` directly instead of relying on state during the initial load. Refactor `fetchServices`, `fetchDiagnoses`, `fetchAppointments`, `fetchTreatmentPlans`, and `calculateStats` to accept an optional `doctorId` argument (falling back to `doctorProfile?.id`), and have `refreshAllData` pass `p.id` explicitly. Realtime `bump()` continues to call them with no argument (state is populated by then).

### 2. Room & bed management: "Could not find a relationship between 'bed_assignments' and 'patients'"

**Root cause:** `src/hooks/useRoomBed.ts` embeds `patients ( full_name )` and `doctors ( profiles ( full_name ) )` in the `bed_assignments` select. There is no `patients` table (only `doctor_patients` / `profiles`), and the FK for `doctors.profiles` isn't set up as a nested embed either, so PostgREST rejects the whole query and the panel fails to load.

**Fix:** Fetch `bed_assignments` without embeds, then hydrate names in a follow-up step:
- Collect distinct `patient_id`s → query `profiles` (id, full_name) in one call.
- Collect distinct `doctor_id`s → query `doctors` joined to `profiles:user_id (full_name)` in one call.
- Map results back into the `BedAssignment.patient_name` / `doctor_name` fields.

### 3. Queue display link uses preview host

**Root cause:** `src/components/rooms/QueueDisplaySettings.tsx` builds the link with `${window.location.origin}/display/${token}`, which becomes the Lovable preview URL when the admin is testing there.

**Fix:** Introduce a canonical public origin and use it for the display link. Add a small helper (e.g. `src/lib/publicUrl.ts`) that returns:
- `https://docito.app` when running on any `docito.app`, `www.docito.app`, or preview/lovable/localhost host.
- `window.location.origin` when running on `docito.live` (so that domain keeps working too).

Use it as `${getPublicAppUrl()}/display/${token}` in both the copy-to-clipboard action and the visible URL row. The `/display/:token` route is already public and unprefixed, so links open correctly on the real domain regardless of where they were generated.

### 4. Patient section nav buttons show white text in light mode

**Investigation step, then fix:** Load `/practices/dashboard` in light mode, open the Patients section, and identify the offending nav — likely `PatientDetailSection.tsx` / `PatientListSection.tsx` sub-tabs or the `PatientRecordsUnified` tab row. Replace any hardcoded `text-white`, `bg-white`, or non-semantic color utilities on those buttons with semantic shadcn `Button` variants (`variant="outline"` for inactive, `variant="default"` for active) so the foreground color follows the theme in both modes.

If the culprit turns out to be a shared `Button` variant override rather than the patient screens themselves, fix it at that variant instead of patching each caller.

### Technical notes
- No database migration needed.
- No changes to `src/integrations/supabase/types.ts`.
- Files touched (expected):
  - `src/hooks/useDoctorIntegration.ts`
  - `src/hooks/useRoomBed.ts`
  - `src/components/rooms/QueueDisplaySettings.tsx`
  - `src/lib/publicUrl.ts` (new)
  - one or two files under `src/components/doctor/patients/` or `src/components/patient/` (identified during step 4)
