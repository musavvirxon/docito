## Goal

Fix the "not verified = 404" bug and give the five account types (doctors, clinics/hospitals, labs, imaging centers, pharmacies) consistent, honest search cards and profile pages: real verification state, working buttons, three distinct load outcomes (missing / pending / verified), and reliable logos.

## Root cause of the doctor 404

`doctor_public_profile_view` (primary source used by `src/pages/doctor/DoctorPublicProfile.tsx` — sources array: `["doctor_public_profile_view", "doctor_profiles_view"]`) filters `WHERE d.verified = true`. Unverified doctors return zero rows → the page shows Not Found instead of a pending state.

Good news for the other four: `usePharmacyPublicProfile`, `useLabPublicProfile`, `useImagingPublicProfile`, `usePracticePublicProfile` already query the base tables and already return `verified` / `is_verified` — no view filter to strip. They just don't distinguish "missing" from "pending" in the UI yet.

Also: the current `homepage_unified_search` (migration `20260707120000_enrich_unified_search.sql`) already `SELECT`s a `verified` column for every type but the frontend `normalizeRpcResults` throws it away, and it never returns `practice_type` for clinics.

## Changes

### 1. Database — two migrations

**a. Recreate `doctor_public_profile_view` and `doctor_profiles_view` without the verified filter**, keeping `verified` as a normal returned column. `WITH (security_invoker=on)` per project standard. Regrant `SELECT` to `anon, authenticated`. Everything else about the views stays identical so existing consumers keep working.

**b. Extend `homepage_unified_search`** to also return `practice_type text` (from `practices.practice_type`, NULL for other rows). No WHERE changes — the enrich migration already doesn't filter by verified.

### 2. `src/hooks/useUnifiedSearch.ts`

- Add `verified: boolean` to `DoctorResult`, `ClinicResult`, `PharmacyResult`, `LabResult`, `ImagingResult`.
- Add `practiceType: string | null` to `ClinicResult`.
- In `normalizeRpcResults`, read `verified` off every raw row and `practice_type` on clinic rows.

### 3. The five search cards (`src/components/search/cards/*.tsx`)

For each card:
- Read `verified` from the new field. If true → keep the existing badge (or add a small verified check where `DoctorSearchCard` currently hardcodes one). If false → render a muted `Badge variant="secondary"` reading "Pending verification". Never render an unconditional verified checkmark.
- Confirm the primary click target (`View Profile` / `View Clinic` / card body) resolves to a route that exists: `/doctor/:slug` (or username / id fallback), `/practice/:id`, `/pharmacy/:id`, `/lab/:id`, `/imaging/:id` — all five now exist per prior work.
- `ClinicSearchCard`: use `clinic.practiceType` for the type label; if it's "hospital" (case-insensitive), swap the icon to lucide's `Hospital` and label "Hospital", otherwise keep `Building2` / "Clinic".
- Confirm the avatar `AvatarImage src={entity.image}` path is present and `AvatarFallback` renders when null. No layout changes.

### 4. Messaging button — pass the right id

`create_direct_conversation` / `start_direct_conversation` (whichever `useMessageAction` calls) expects a `user_id`, not a facility row id. Audit:
- Doctors: pass the doctor's `user_id`, not `doctors.id`. Add `user_id` to the doctor branch of `homepage_unified_search` and to `DoctorResult`, then have `DoctorSearchCard` call `startConversation(doctor.userId)`.
- Practices / pharmacies / labs / imaging: these are facility entities; the message target is the facility's `admin_id` (present on each row's admin column). Same treatment — add `admin_id` to the RPC per non-doctor branch, expose as `adminId` on the result types, and pass it to `startConversation`. If `admin_id` is null, disable the Message button with a tooltip rather than firing and failing silently.

Remove the "id might need to map to user_id" TODO comment in `DoctorSearchCard.tsx` once fixed.

### 5. Three-state profile pages

Update each of `DoctorPublicProfile`, `PracticePublicProfile`, `PharmacyPublicProfile`, `LabPublicProfile`, `ImagingPublicProfile`:

```text
row === null            → NotFound state (existing)
row.verified === false  → new PendingVerification state
row.verified === true   → full profile (existing)
```

Add a small shared component `src/components/facility/public/PendingVerificationState.tsx` that takes `{ name, logoUrl, entityType, verificationStatus? }` and renders a centered card with the logo/initials, name, and a muted message. When `verification_status` is present and meaningful (`pending` / `rejected` / `submitted`), reflect it — otherwise fall back to a generic "hasn't completed verification yet."

Per-table field to check:
- `doctors.verified` (boolean)
- `practices.verified` + optional `practices.verification_status`
- `pharmacies.verified` (no status text column)
- `lab_centers.is_verified`
- `imaging_centers.is_verified`

Extend `useLabPublicProfile` / `useImagingPublicProfile` / `usePharmacyPublicProfile` / `usePracticePublicProfile` to expose that verified field on the returned object (some already do — audit and align naming to `verified: boolean`). Extend the doctor profile page's lookup result to read `verified` off the (now-unfiltered) view.

### 6. Photos audit

For each of the five types, walk RPC → normalize → card → profile page and confirm:
- Column read matches actual DB column (`profiles.avatar_url` for doctors; `logo_url` for practices/pharmacies/lab_centers/imaging_centers).
- `AvatarFallback` renders when the URL is null.
- No case-mismatch (`image_url` vs `imageUrl`) between RPC output and `normalizeRpcResults`.

No visual redesign — just correctness pass.

## Files touched

- `supabase/migrations/<new>_doctor_public_views_expose_verified.sql`
- `supabase/migrations/<new>_unified_search_add_practice_type_and_ids.sql`
- `src/hooks/useUnifiedSearch.ts`
- `src/hooks/useLabPublicProfile.ts`, `useImagingPublicProfile.ts`, `usePharmacyPublicProfile.ts`, `usePracticePublicProfile.ts` (verify/expose `verified`)
- `src/components/search/cards/DoctorSearchCard.tsx`, `ClinicSearchCard.tsx`, `PharmacySearchCard.tsx`, `LabSearchCard.tsx`, `ImagingSearchCard.tsx`
- `src/pages/doctor/DoctorPublicProfile.tsx`, `src/pages/PracticePublicProfile.tsx`, `src/pages/PharmacyPublicProfile.tsx`, `src/pages/LabPublicProfile.tsx`, `src/pages/ImagingPublicProfile.tsx`
- `src/components/facility/public/PendingVerificationState.tsx` (new)
- Locale strings under `public/locales/{en,ru,uz}/practicePage.json` for the new pending/notFound copy.

## Out of scope

Visual redesign of cards or profile pages, review system changes, and any changes to non-search / non-profile routes.
