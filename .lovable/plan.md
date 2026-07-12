## Add public profile routes for Pharmacy, Lab, and Imaging Center

Mirror the existing `PracticePublicProfile` pattern for three new facility types.

### 1. `src/App.tsx` — routing

- Add three lazy imports next to the existing `PracticePublicProfile` import:
  ```ts
  const PharmacyPublicProfile = lazy(() => import("@/pages/PharmacyPublicProfile"));
  const LabPublicProfile      = lazy(() => import("@/pages/LabPublicProfile"));
  const ImagingPublicProfile  = lazy(() => import("@/pages/ImagingPublicProfile"));
  ```
- Find both route blocks containing:
  ```tsx
  <Route path="practice/:id" ... />
  <Route path="practices/:id" ... />
  <Route path="clinic/:id" ... />
  ```
  In **both** blocks, immediately after those lines, add:
  ```tsx
  <Route path="pharmacy/:id" element={<PharmacyPublicProfile />} />
  <Route path="lab/:id"      element={<LabPublicProfile />} />
  <Route path="imaging/:id"  element={<ImagingPublicProfile />} />
  ```
  These `:id`-suffixed paths do not collide with the existing bare `pharmacy` / `lab` / `imaging` landing routes (different segment counts).

### 2. Locale files — add new keys under `practicePage`

Add the following keys to the existing `practicePage` object (do not touch anything else in the files):
- `public/locales/en/practicePage.json` — English (verbatim from the request)
- `public/locales/ru/practicePage.json` — Russian translations of the same keys
- `public/locales/uz/practicePage.json` — Uzbek translations of the same keys

Keys added: `call`, `pharmacy.*`, `lab.*`, `imaging.*` (title, cta, section titles, notFoundTitle/Description; plus `pharmacy.delivery`/`insurance` and `lab.turnaround` with `{{hours}}` interpolation).

All other keys the new pages consume (`back`, `loading`, `verified`, `website`, `contact.*`, `hours.*`, `hero.reviews`, `trust.*`) already exist and remain untouched.

### Out of scope
This plan does not create the `PharmacyPublicProfile` / `LabPublicProfile` / `ImagingPublicProfile` page components themselves — the instructions only cover wiring routes + translation keys. If those page files don't yet exist, the routes will fail to import at runtime. **Please confirm whether these page components already exist, or whether I should also scaffold them (mirroring `PracticePublicProfile`) as part of this change.**
