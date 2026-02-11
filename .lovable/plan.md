

# Fix Manifest CORS and Deprecated Meta Tag

## Problem

The `site.webmanifest` file is intercepted by the Lovable preview auth-bridge, causing a cross-origin redirect that browsers block. This produces console errors in both preview and production contexts.

## Solution

Two small changes to `index.html`:

### 1. Add `crossorigin="use-credentials"` to the manifest link (line 17)

This instructs the browser to treat the manifest fetch as a credentialed CORS request, allowing it to follow the auth-bridge redirect in preview while remaining fully compatible in production (where no redirect occurs).

```html
<link rel="manifest" href="/site.webmanifest" crossorigin="use-credentials" />
```

### 2. Fix deprecated meta tag (line 20)

Replace the deprecated `apple-mobile-web-app-capable` with the modern `mobile-web-app-capable`:

```html
<meta name="mobile-web-app-capable" content="yes" />
```

These are the only two lines that change. No other files are affected.

