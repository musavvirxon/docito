# Make the clinic URL card link to the clinic's public profile page

## Current state (verified)
- In `src/pages/AdminDashboard.tsx` (lines ~5704–5718), the "Patient Booking Page" card shows a hardcoded `docito.com/` prefix, an editable slug input (a stub — saving only writes `custom_url: true` into branding settings), and a "Preview" button that wrongly opens `/doctors`.
- The real clinic public profile route exists: `/practice/:id` → `PracticePublicProfile.tsx` (also `/practices/:id`, `/clinic/:id`). It resolves the practice by the `:id` URL param.
- Canonical domain is `docito.app` (project branding standard; the card's `docito.com` is wrong).

## Change
In that card:
1. Replace the `docito.com/` + slug input with a read-only field showing the clinic's actual public profile URL: `https://docito.app/practice/{practice.id}`.
2. Replace the "Save URL" button with a "Copy link" button (writes the URL to the clipboard, shows a brief "Copied" state). Remove the stub `custom_url` save call.
3. Point the preview button at the real page: `window.open('/practice/' + practice.id, '_blank')` — on production this resolves to the docito.app public profile; relabel it "Preview Public Profile".
4. Add i18n keys `copyUrl` and `copied` to the `admin.st` block in `public/locales/{en,ru,uz}/dashboard.json`; update the `preview` label wording. No hardcoded English in the component.

## Verification
- `npx tsgo --noEmit -p tsconfig.app.json`.
- Playwright screenshot of the clinic admin Settings → Branding card showing the real URL and testing Copy + Preview (opens `/practice/{id}`).
