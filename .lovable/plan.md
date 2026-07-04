Apply the five surgical changes exactly as specified:

1. **src/App.tsx** — Add `const PracticePublicProfile = lazy(() => import("@/pages/PracticePublicProfile"));` near other lazy imports. Insert three `<Route path="/practices/:id" element={<PracticePublicProfile />} />` (plus `/practice/:id` alias and slug variant per the three lines described) in BOTH the language-prefixed and non-prefixed public route blocks.

2. **src/components/settings/ClinicAdminWorkspaceSettings.tsx** — Add `bannerUrl`, `instagramUrl`, `facebookUrl`, `twitterUrl` state; hydrate them in the existing practice-load `useEffect`; include them in the `handleSave` `.update({...})` payload; add JSX for a Banner section (using existing BannerUpload component + preview + Remove button) and three social link `<Input>` fields, placed inside the same tab/card as the existing LogoUpload.

3. **public/locales/en/practicePage.json** — Merge all listed profile keys (`notFound`, `loading`, `verified`, `bookAppointment`, `callClinic`, `getDirections`, `shareProfile`, `linkCopied`, `website`, `back`, `hero`, `about`, `contact`, `hours`, `doctors`, `services`, `trust`, `social`, `seo`, `admin`) into the existing `practicePage` object without touching existing marketing keys. Note: the file on disk already contains these keys — verify and add only what's missing.

4. **src/components/cards/ClinicCard.tsx** — Replace both `navigate('/practice/${id}...')` calls with `navigate('/practices/${id}')`.

5. **src/pages/FindPractices.tsx** — Confirm `PracticeCard` onClick uses `/practices/` (with 's'); fix if not.

### Verification
- Read each target file first to get exact current content before editing.
- Confirm `PracticePublicProfile.tsx`, `BannerUpload` component, and `data.banner_url`/social columns exist (or note if a migration is needed — user didn't request one, so assume columns exist).
- After edits: check that `/practices/:id` route resolves and clinic cards navigate correctly.

### Out of scope
No other files, styling, or logic. No Russian/Uzbek locale updates (user only listed the English file).
