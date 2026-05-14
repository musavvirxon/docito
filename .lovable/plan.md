## Goal

Restyle the referral PDF (`supabase/functions/referral-generate-pdf/index.ts`) so it feels like a Docito-branded clinical document, prioritizes human-readable info (referrer/receiver names), de-emphasizes raw IDs, and fits the page to the actual content (no half-empty A4).

## Changes

### 1. Resolve real names (not just IDs)

Before drawing, fetch display names in parallel from the service client:
- Referrer user → `profiles.full_name` via `referrer_user_id`
- Receiver user → `profiles.full_name` via `receiver_user_id`
- Referrer entity name → query the right table by `referrer_type` (`clinics`, `hospitals`, `laboratories`, `pharmacies`, `doctors`)
- Receiver entity name → same pattern by `receiver_type`

Show the resolved names as the primary value; keep the entity type as a small caption.

### 2. De-emphasize IDs

- Drop `referrerUserId`, `receiverUserId`, `referrerEntityId`, `receiverEntityId`, `assignedImagingStaffId`, and the System `id` row from the main key/value sections.
- Move the referral UUID + entity/user IDs into a single tiny gray monospace footer line ("Ref ID: … · Referrer: … · Receiver: …") at ~7pt so they remain auditable but visually quiet.
- Verification code / referral number stay prominent (next to QR).

### 3. Branding

- Header band: thin Docito brand-colored rule under the logo+title, plus a subtle brand accent on each `sectionHeader` (left 3px colored bar + slightly lighter fill).
- Use brand HSL primary translated to RGB constants at top of file (single source).
- Footer: "Docito • docito.live" left, generated date right, separated by a hairline rule.
- Light watermark/logo monogram bottom-right at low opacity (only if logo embedded successfully — keep current try/catch).

### 4. Auto-size page to content

Currently the page is a fixed A4. Change to a two-pass render:
1. First pass: run the same drawing logic against a measurement-only stub (no real `page.draw*` calls) to compute total content height.
2. Create the page with `width = 595.28` (A4 width preserved for print familiarity) and `height = max(minHeight, contentHeight + topMargin + bottomMargin + footerBlock)`. `minHeight ≈ 360pt` so very small referrals still look like a card, not a sliver.
3. Second pass: draw for real onto the sized page.

This makes the "paper" only as tall as the data, matching the compact "Details" panel feel.

### 5. Visual polish

- Reduce body font to 9.5pt, labels 9pt uppercase tracked, values 10pt.
- Section headers: 11pt semibold-look (Helvetica-Bold when standard font path is used; fall back to primary font otherwise).
- Tighter `lineHeight` (12) and section spacing (10) so the page stays compact.
- Patient / Referrer / Receiver rendered as 3 stacked mini-cards with rounded-look rectangles (1px border, 6pt inner padding) instead of plain key/value rows — name is the headline, contact/type is the subline.

## Out of scope

- No DB schema changes.
- No changes to who can download the PDF (auth logic untouched).
- No changes to the calling UI.

## Technical notes

- Add `Helvetica-Bold` embed alongside `Helvetica` when `canUseStandardFont(locale)` is true; for non-Latin locales reuse the single embedded Unicode font for both.
- Measurement pass: factor current draw helpers into `(mode: "measure" | "draw")` variants, or simpler — keep helpers but pass an optional `page` (null = measure). Track `y` decrements identically in both passes so heights match exactly.
- Name lookups: wrap each in `try/catch` and fall back to the existing ID/string so a missing profile never breaks the PDF.
- Keep existing logo/QR/RTL/locale logic intact.
