# Fix 404 on /book-appointment/:doctorId in production

## 1. `src/App.tsx` — redirect root-level booking URL to localized path

The root-level `book-appointment/:doctorId` (line 289) is already mounted inside the `PublicLayout` group, so layout/providers are intact. The remaining issue is that canonical URLs should always carry a language prefix.

- Replace the root-level `<Route path="book-appointment/:doctorId" element={<AppointmentBooking />} />` (and the sibling `book/:doctorId`) with a `<Navigate>` element that forwards to `/{lang}/book-appointment/:doctorId`, preserving the `:doctorId` param and any query string.
- Resolve `{lang}` from the existing language detector used elsewhere (read `i18n.language` / localStorage / `navigator.language`, fall back to `'en'` and validate against `supportedLangCodes`).
- Use a tiny wrapper component (`RedirectToLocalizedBooking`) that calls `useParams()` + `useLocation()` and returns `<Navigate to={`/${lang}/book-appointment/${doctorId}${search}`} replace />`. Apply the same wrapper to `book/:doctorId` for symmetry.
- Leave the language-prefixed route at line 187 untouched — it's the real render target.

## 2. `vite.config.ts` — bundle `_redirects` and `_headers` into `dist`

Add a small post-build Rollup plugin so Cloudflare Pages always sees the SPA fallback file, even when wrangler skips copying from `public/`.

- New `copyCloudflareConfigPlugin(): Plugin` with `apply: 'build'` and a `closeBundle` hook (more reliable than `buildEnd` for emitting files alongside the final output).
- The hook reads `public/_redirects` and `public/_headers` with `node:fs/promises` and writes them to `dist/_redirects` and `dist/_headers`. Wrap each copy in try/catch and log a warning if the source is missing rather than failing the build.
- Register the plugin in the `plugins` array after `asyncCssPlugin()`.

## 3. `.github/workflows/cloudflare-pages-deploy.yml` — verify `_redirects` after build

Insert a single verification step between **Build** and **Deploy to Cloudflare Pages**:

```yaml
- name: Verify Cloudflare config files
  run: |
    echo "=== dist/_redirects ==="
    cat dist/_redirects
    echo "=== dist/_headers ==="
    cat dist/_headers || echo "(no _headers)"
```

This fails fast if the Vite plugin regresses.

## Files touched

- `src/App.tsx` — add `RedirectToLocalizedBooking` wrapper + swap two root-level routes.
- `vite.config.ts` — add `copyCloudflareConfigPlugin` and register it.
- `.github/workflows/cloudflare-pages-deploy.yml` — add verification step.

## Out of scope

- Translations (per the user's instruction).
- Touching the language-prefixed booking route or `AppointmentBooking` itself.
