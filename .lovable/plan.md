## Goal

Two public pages — `docito.app/demo` and `docito.app/pitch` — each with its own headline video and a list of downloadable files. All content is managed from a new "Demo & Pitch" section in the Super Admin dashboard. No login needed to view or download.

## Pages (public)

Each page renders:
- Hero: title, subtitle, short description (all editable, i18n-free free text set by admin).
- Video player:
  - Uploaded MP4/WebM → native `<video>` player with poster image.
  - YouTube/Vimeo link → responsive embed (URL auto-parsed into embed form).
  - Any direct URL (mp4/hls) → native player.
- Downloads: card list of files (name, description, size, type icon) with a Download button. Uploaded files get a signed/public URL; external links open directly.
- Optional CTA button (label + URL) e.g. "Book a demo".
- SEO head: page-specific title/description, `og:type=video.other`, canonical.
- Hidden/unpublished pages show a simple "Coming soon" state instead of 404.

`/demo` and `/pitch` use one shared page component driven by a `slug` param, so content is separate but layout is shared.

## Data model (new tables)

`public.showcase_pages`
- `id`, `slug` (unique: `demo` | `pitch`, free text so more can be added later)
- `title`, `subtitle`, `description`
- `video_kind` ('none' | 'upload' | 'embed' | 'direct'), `video_url`, `video_storage_path`, `poster_url`
- `cta_label`, `cta_url`
- `is_published` (default false), `created_at`, `updated_at`

`public.showcase_assets`
- `id`, `page_id` → showcase_pages (cascade)
- `label`, `description`, `kind` ('file' | 'link')
- `storage_path`, `external_url`, `file_size`, `mime_type`
- `sort_order`, `is_visible`, `created_at`

Grants + RLS:
- `GRANT SELECT` to `anon` and `authenticated`; full CRUD to `authenticated` gated by policy; `GRANT ALL` to `service_role`.
- Read policy: rows where `is_published = true` (assets: parent published and `is_visible`).
- Write policies: `public.has_role(auth.uid(), 'super_admin')` only.
- Seed the two rows (`demo`, `pitch`) unpublished.

Storage: new public bucket `showcase` (video + downloadable files). `storage.objects` policies — public read on that bucket, insert/update/delete restricted to super admins.

## Super Admin dashboard

New sidebar item **Demo & Pitch** → `ShowcaseManager` component (same switch-case pattern as existing sections), containing:
- Tabs for each page (Demo / Pitch).
- Page settings form: title, subtitle, description, CTA, publish toggle, "Open page" link.
- Video block: radio for upload / embed link / direct URL; drag-drop uploader with progress; poster upload; preview player.
- Files block: uploader (multi-file) + "Add link" row; table with inline rename, description, visibility toggle, drag-to-reorder, delete (also removes the storage object).
- Everything writes through the Supabase client under super-admin RLS; toasts on save.

## Technical notes

- Route registration in `src/App.tsx` inside the existing `PublicLayout` block: `/demo` and `/pitch` → `ShowcasePage` (lazy). Both preview and production route trees get the entries.
- New hook `src/hooks/useShowcasePage.ts` (public read by slug, with assets) and `useShowcaseAdmin.ts` (mutations + uploads).
- New files: `src/pages/ShowcasePage.tsx`, `src/components/showcase/ShowcaseVideo.tsx`, `ShowcaseDownloads.tsx`, `src/components/admin/ShowcaseManager.tsx`, `src/lib/videoEmbed.ts` (YouTube/Vimeo URL parsing).
- Uploads validated client-side: video ≤ 500MB, files ≤ 50MB, mime allow-list; URLs validated with `zod` and rendered only as `https://` links.
- Styling follows the existing Apple/Tesla semantic-token system — no hardcoded colors.
- Add `/demo` and `/pitch` to `public/sitemap-index.xml` handling when published.

## Out of scope

No analytics/view tracking, no access codes, no per-viewer gating (page is fully public as requested).
