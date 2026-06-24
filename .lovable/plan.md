## 1. Public profile URL — force `docito.app` and stop "not found" on verified-but-restricted profiles

**Domain:** In `src/components/doctor/DoctorProfileSection.tsx`, replace `window.location.origin` with a hard-coded patient origin so the shared link is always under `docito.app` regardless of which dashboard host the doctor is on (matches existing `src/lib/booking.ts` pattern).

```ts
const PUBLIC_PROFILE_ORIGIN = "https://docito.app";
const publicUrl = publicSlug ? `${PUBLIC_PROFILE_ORIGIN}/doctor/${publicSlug}` : "";
```

Also expose a tiny helper in `src/lib/booking.ts` (`getDoctorPublicProfileUrl(slug)`) so other call sites stay consistent.

**Loading → "Doctor not found":** `src/pages/doctor/DoctorPublicProfile.tsx` only queries `doctor_public_profile_view`, which filters to `d.verified = true AND profile_visibility <> 'private'`. Any doctor that is not yet verified, or whose visibility is anything other than `public`, falls through and the page shows "Doctor not found" after the spinner.

Fix:
- After the `doctor_public_profile_view` lookup misses, fall back to `doctor_profiles_view` (the same pattern `src/lib/doctorSlug.ts` already uses), still matching `custom_profile_link` → `username` → `id`.
- If the fallback row exists but `verified = false`, still render the profile and show a small "Profile under verification" badge near the hero instead of the 404 card. Booking CTA stays available — booking permission is controlled separately.
- Keep the `isUuid` branch and `ilike` casing behavior unchanged.

## 2. Diagnoses tab — show existing rows on first open

In `src/pages/AppointmentSession.tsx`, `fetchDiagnoses` runs only via `useEffect` on mount. When the user re-enters the Diagnoses tab on an appointment that already has rows, the list looks empty until they add one (which forces a refetch). Two issues compound this:
- The tab itself doesn't trigger a refetch when re-selected.
- There is no realtime subscription, so diagnoses added from another surface (e.g. tooth picker, quick preview) never appear without a manual reload.

Fix in `AppointmentSession.tsx`:
1. Call `fetchDiagnoses()` whenever the active tab becomes `diagnoses` (existing tab state already lives in the file) — guarantees a fresh read on every open.
2. Add a Supabase realtime subscription on `appointment_diagnoses` filtered by `appointment_id=eq.<id>` (INSERT/DELETE/UPDATE) that calls `fetchDiagnoses()`. Use a unique channel name (`appointment-diagnoses-${appointmentId}-${Date.now()}-${random}`) per the project's realtime memory.
3. Clean up the channel in the effect's return.

No schema changes needed.

## 3. Prescription "+ New Prescription", Re-prescribe, and Eye buttons — stop opening an empty overlay

In `src/components/doctor/prescriptions/DoctorPrescriptionsSection.tsx`, `openCreator` / `openDetail` always call `setSheetOpen(true)`. The Sheet's `SheetContent` is `lg:hidden`, but the Radix portal still mounts the overlay on desktop, which the user sees as "a new window that shows nothing" (it covers the desktop right panel that's already showing the same content).

Fix:
- Track viewport with `useIsMobile` (or `window.matchMedia('(min-width: 1024px)')`) and only set `setSheetOpen(true)` when below `lg`. On desktop the right column already renders the creator/detail panel inline, so no sheet is needed.
- Ensure `rightPanel` and `selectedRxId` are still updated unconditionally so the desktop panel switches as expected.
- Quick smoke check: clicking "+ New Prescription", the Eye, and Re-prescribe on desktop opens the right column (creator or detail) with no overlay; on mobile, the sheet opens as before.

## Files to touch
- `src/components/doctor/DoctorProfileSection.tsx` — hard-coded `docito.app` origin.
- `src/lib/booking.ts` — add `getDoctorPublicProfileUrl` helper (small, optional consumer).
- `src/pages/doctor/DoctorPublicProfile.tsx` — fallback lookup + soft "under verification" state instead of 404.
- `src/pages/AppointmentSession.tsx` — tab-change refetch + realtime subscription for `appointment_diagnoses`.
- `src/components/doctor/prescriptions/DoctorPrescriptionsSection.tsx` — gate `setSheetOpen` to mobile only.

## Out of scope
No DB migrations, no edge-function changes, no changes to PDF generation, patient lookup, or prescription templates from prior turns.
