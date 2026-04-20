
## Cause

`ERR_BLOCKED_BY_RESPONSE` on `target="_blank"` links is almost always caused by the destination site sending an `X-Frame-Options: DENY` or `Cross-Origin-Opener-Policy` header that conflicts with the opener context. In our case, the root cause is in `public/_headers`:

```
/*
  X-Frame-Options: DENY
```

This header is applied to **every response** from our domain. When a user clicks a `target="_blank"` link inside the Lovable preview iframe (or any embedding context), the browser opens the new tab with our page as the opener. Combined with `X-Frame-Options: DENY` and the lack of an explicit `Cross-Origin-Opener-Policy`, Chromium blocks the navigation with `ERR_BLOCKED_BY_RESPONSE` when the opener relationship is considered cross-origin-unsafe.

It also fails in production (docito.live) because `_headers` ships with the Cloudflare Pages build — same header, same block.

Additionally, several of our external links likely lack `rel="noopener noreferrer"`, which makes the browser keep an opener reference and trip the same protection.

## Fix Plan

**1. Relax the global header in `public/_headers`**
- Keep `X-Frame-Options: DENY` only on sensitive HTML routes (root `/` and `/index.html`), not on every asset.
- Add `Cross-Origin-Opener-Policy: same-origin-allow-popups` so popups/new tabs to third-party sites are permitted.
- Keep `X-Content-Type-Options` and `Referrer-Policy` global.

**2. Audit every external `<a target="_blank">`** in:
- `src/pages/Contact.tsx` (WhatsApp link)
- `src/pages/Support.tsx` (WhatsApp + Discord links)
- Any other pages using `target="_blank"` (quick grep)

Ensure every one has `rel="noopener noreferrer"`.

**3. Verify the WhatsApp/Discord URLs are correct**
- WhatsApp: `https://wa.me/qr/O5HYYPMF52NBD1` (confirm the QR code path is current — these can expire; if it 404s we'll switch to a direct number link).
- Discord: user-provided `https://discord.gg/ZAKe8hTeX` looks short — Discord invite codes are usually 8+ chars. Confirm with user it's not truncated.

**4. Republish**
- Frontend changes (`_headers`, link attributes) require clicking **Update** in Publish dialog to take effect on docito.live.

## Files to change

- `public/_headers` — scope `X-Frame-Options`, add `COOP`
- `src/pages/Contact.tsx` — add `rel="noopener noreferrer"` to WhatsApp anchor
- `src/pages/Support.tsx` — add `rel="noopener noreferrer"` to WhatsApp + Discord anchors

## One clarification needed

The Discord invite `https://discord.gg/ZAKe8hTeX` looks truncated (typical invites are longer). I'll use it as-is unless you confirm the full code — but worth double-checking before we ship.
