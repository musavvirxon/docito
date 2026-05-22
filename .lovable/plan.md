# Fix public doctor profile route + canonical booking link

## Problems observed

1. `/doctor/drjohndoe1` does not open the public profile.
   - In `src/App.tsx`, the `:lang` wrapper consumes any first segment, including `doctor`. The only `doctor/:slug` route inside that wrapper requires 3 URL segments, so a 2-segment URL never matches it from a localized link, and the non-language sibling block is only reached when the route ranker prefers it (fragile). When the splat (`*` → `NotFound`) inside `:lang` wins for any 2-segment URL whose first part is not a known language, the page shows NotFound.
   - The slug lookup in `DoctorPublicProfile.tsx` builds an `.or(...)` filter with raw user input. Slugs that contain `.` (e.g. real link `dr.John.Doe1`) break PostgREST's `or` syntax and return 0 rows.

2. The booking / profile link copied from the doctor dashboard shows the Lovable preview URL when the app is opened from preview.
   - `src/lib/booking.ts → getPublicBookingOrigin()` only returns `https://docito.app` when `window.location.hostname` is in a small prod allow-list, otherwise it falls back to `window.location.origin`. We want shareable links to always point at `https://docito.app`, regardless of the host the doctor is currently on.

3. Both `docito.live` and `docito.app` must serve `/doctor/:slug`. The route already exists on both hosts (same SPA), but step 1 fixes the actual blocker so it works on each domain.

## Changes

### 1. Guard the language wrapper so non-language first segments fall through

`src/App.tsx`

- In `LanguageWrapper`, if `lang` is not in `supportedLangCodes`, render `<Navigate to={location.pathname} replace />` is not viable (loops). Instead, change the route definition so the language wrapper only matches known language codes. Replace:

  ```tsx
  <Route path=":lang" element={<LanguageWrapper />}>
  ```

  with an explicit list mapped from `supportedLangCodes`:

  ```tsx
  {supportedLangCodes.map((code) => (
    <Route key={code} path={code} element={<LanguageWrapper />}>
      {/* existing children */}
    </Route>
  ))}
  ```

  Extract the existing children into a shared `renderLocalizedRoutes()` helper (or a `<Route>` fragment via a constant) so we do not duplicate the route tree.

  This guarantees `/doctor/drjohndoe1` never matches the `:lang` branch and cleanly falls into the existing non-language `<Route path="doctor/:slug">` at line 267.

### 2. Make slug lookup resilient to special characters

`src/pages/doctor/DoctorPublicProfile.tsx` (around line 100-115)

- Stop building a comma-joined `.or()` string with raw slug values. Run up to three targeted queries with `.eq()` and pick the first non-null:
  1. `custom_profile_link.eq(slug)`
  2. `username.eq(slug)`
  3. if `slug` is a UUID, `id.eq(slug)`
- Use `.limit(1).maybeSingle()` for each. Keep the existing not-found UI when all three return null.

### 3. Always use `docito.app` for shareable links

`src/lib/booking.ts`

- Simplify `getPublicBookingOrigin()` to always return `PUBLIC_BOOKING_ORIGIN` (`https://docito.app`). Drop the `PROD_HOSTS` allow-list and the `window.location.origin` fallback.
- Keep `getBookingPath()` (relative) unchanged for in-app `navigate(...)` calls.

### 4. Canonical URL on the public profile page

`src/pages/doctor/DoctorPublicProfile.tsx`

- Already builds `https://docito.app/doctor/${slug}` for the canonical tag — leave as is. This keeps SEO pointing at one domain while both `docito.live` and `docito.app` continue to serve the page.

## Out of scope

- No DNS / hosting config changes are needed; `docito.live` and `docito.app` already point at the same SPA, and `/doctor/:slug` exists at the top level.
- No database / RLS changes; `doctor_public_profile_view` already exposes `drjohndoe1`.
