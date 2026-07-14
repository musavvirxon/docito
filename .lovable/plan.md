
# Consolidate search onto one implementation

Three separate search UIs exist today. This plan retires two of them and centralizes on the home-page stack (`useUnifiedSearch` + `SearchResultsContainer` + the five typed cards), then finishes the verification/messaging/i18n polish so a single fix propagates to every entry point.

Work is sequenced A → B → C → D with a build check between phases so any regression is attributable.

---

## A. `SearchDoctors.tsx` (`/find-doctors`, `/search-doctors`)

**Product decision baked in:** page stays doctor-focused but does *not* hide other entity types. It defaults `SearchFilters` to `{ doctors: true, clinics: false, pharmacies: false, labs: false, imaging: false }` and lets the user broaden via the existing `SearchFiltersBar`. Rationale: users landing on `/find-doctors` expect doctors first, but discovering an allied clinic/lab from the same query is a plus, not a bug.

Changes:

1. Rewrite `SearchDoctors.tsx`:
   - Drop `useDoctorSearch`, `SearchResultsEnhanced`, `DoctorProfileModal`, `BookingModal` imports and state (`selectedDoctor`, `showProfileModal`, `showBookingModal`, `viewMode`, `sortBy`, `savedDoctors`).
   - Use `useUnifiedSearch()` — pull `results`, `loading`, `error`, `filters`, `hasSearched`, `search`, `updateFilters`.
   - Seed filters on mount with `updateFilters({ clinics: false, pharmacies: false, labs: false, imaging: false })`.
   - Keep the local search input and location text; call `search(query, location, filters)`.
   - Render `<SearchResultsContainer results={results} loading={loading} error={error} filters={filters} hasSearched={hasSearched} onFilterChange={(key) => updateFilters({ [key]: !filters[key] })} onBookDoctor={handleBook} />`.
   - `handleBook(doctor)` opens `BookingModal` with the `DoctorResult` — pass `doctor.id` (the doctor id from the RPC) into the modal. Confirm `BookingModal` reads `doctor.id`/`doctor.name` fields; adapt shape if needed.
2. Retire the old `EnhancedFilters` sidebar. The unified stack uses `SearchFiltersBar` for entity toggles. Rich filters (specialty, price, insurance, video) aren't part of the unified RPC yet — remove them from this page rather than layering a second filter system that doesn't actually filter the results. (A follow-up can extend `homepage_unified_search` to accept these; out of scope here.)
3. Delete `useDoctorSearch.ts` and `SearchResultsEnhanced.tsx` if no other consumer imports them (verify with a repo search before removing). Keep `DoctorProfileModal` around only if still used elsewhere; from this page, "View Profile" goes through `DoctorSearchCard` → real `/doctor/:slug` route.

---

## B. `CategorySearch.tsx` (`/category/:category`)

Currently renders inline mock data. Rewrite as a thin wrapper over the unified stack that pre-seeds the query with the category.

1. On mount, call `search(category, '', filters)` where `filters` defaults to all-true (categories are cross-cutting: "cardiology" should surface doctors *and* clinics).
2. Render heading (`{category} providers`) + `<SearchResultsContainer .../>` with the same props as home.
3. Delete the mock `Doctor[]`, inline `<Card>` markup, and hand-rolled filter sidebar.
4. Keep `SearchBar` at the top so users can refine the query; wire its submit to `search()` instead of navigating to `/search-results`.

---

## C. Verification + button wiring (finish the earlier pass)

Most of this already landed in a prior turn (verified/practiceType/messageUserId are in `useUnifiedSearch`; cards show Pending badge). Remaining gaps to close:

1. **Audit each of the five cards** (`DoctorSearchCard`, `ClinicSearchCard`, `PharmacySearchCard`, `LabSearchCard`, `ImagingSearchCard`) and confirm:
   - "Message" button calls `startConversation(entity.messageUserId)` (not `entity.id`) and is disabled when null.
   - Verified badge vs Pending badge is conditional on `entity.verified`.
   - Remove the stale "never confirmed" comment in `DoctorSearchCard`.
2. **`ClinicSearchCard`**: render `clinic.practiceType` (Hospital / Clinic / Urgent Care) as a small badge next to the name; fall back to "Clinic" when null.
3. **Pending-vs-404 on profile pages** — verify current state of each and fix any still gated on `verified = true`:
   - `DoctorPublicProfile` (already fixed in prior turn — spot-check).
   - `PracticePublicProfile`, `PharmacyPublicProfile`, `LabPublicProfile`, `ImagingPublicProfile`: read their view/RPC; if any filter unverified rows out, ship a migration to drop that filter and render a Pending banner in the page component (same pattern as the doctor page).
4. **DB view sanity**: re-check `doctor_profiles_view` still has the `.eq('verified', true)` in `useDoctorSearch` moot after deleting that hook — no further DB change needed for doctors. For the other four, only migrate if the view/RPC currently hides unverified rows.

Migrations required will be surfaced via `supabase--migration` calls once the profile-page audit in C.3 identifies which views need loosening. Only ships if actually needed.

---

## D. i18n for `SearchResultsContainer`

Wire all hardcoded English through `react-i18next` under a new `search` namespace (or extend `homeSearch` if it already exists — check `public/locales/en/homeSearch.json`).

Strings to key:
- Filter bar: `"Filter by:"`, `"Doctors"`, `"Clinics"`, `"Pharmacies"`, `"Labs"`, `"Imaging"`.
- Section titles (same five) with `"{{count}} result"` / `"{{count}} results"` via `count`-based plural.
- Status: `"Searching..."`, `"Found {{count}} results"`, `"No results found"`, `"Start searching"`, and the two helper paragraphs.

Add the new keys to at least `en` + `ru` + `uz` (project's primary trio); other locales can inherit `en` fallback for now.

---

## Technical notes

- **File touches:** `src/pages/SearchDoctors.tsx` (rewrite), `src/pages/CategorySearch.tsx` (rewrite), `src/components/search/SearchResultsContainer.tsx` (i18n), `src/components/search/SearchFiltersBar.tsx` (i18n), `src/components/search/cards/*SearchCard.tsx` (audit), possibly `src/hooks/useDoctorSearch.ts` + `src/components/search/SearchResultsEnhanced.tsx` (delete), locale JSONs.
- **Type note:** `useUnifiedSearch.search(query, location, filters)` already exists — no signature change needed.
- **Verification per phase:** after A, after B, after C, after D — run typecheck (`tsgo` via harness) and load `/find-doctors`, `/category/cardiology`, and `/` to eyeball parity. If a phase fails the check, stop before starting the next.
- **Out of scope:** rebuilding the rich filter set (specialty/price/insurance/language) on top of the unified RPC. Called out explicitly so it doesn't get quietly dropped — file as a follow-up.
