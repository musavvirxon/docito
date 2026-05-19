## Root cause

`src/main.tsx` calls `requestIdleCallback(...)` unconditionally at module top level (line ~22) to register chunk-load recovery and service-worker cleanup. Safari (macOS and iOS) does not implement `window.requestIdleCallback`, so the module throws `ReferenceError: requestIdleCallback is not defined` before `createRoot(...).render(...)` is reached.

Result: React never mounts, the static `#initial-loader` (Docito logo) in `index.html` is never hidden, and the page hangs on the splash forever in Safari, iPhone, and iPad. Chrome/Firefox/Edge work because they implement the API.

The `hideInitialLoader()` function further down in the same file already guards `requestIdleCallback` with `'requestIdleCallback' in window` — so it would work on its own, but it never gets called because the earlier unguarded call throws first.

## Fix

In `src/main.tsx`, wrap the chunk-recovery registration in a Safari-safe scheduler:

```ts
const scheduleIdle = (cb: () => void, timeout = 2000) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(cb, { timeout });
  } else {
    setTimeout(cb, 1);
  }
};

scheduleIdle(() => {
  // existing chunk-reload + service-worker cleanup body
});
```

This is the only behavioral change required. No other files are affected. Once React mounts, the existing `hideInitialLoader()` (already guarded) will dismiss the splash on Safari like it does elsewhere.

## Verification

After the edit:
1. Open the published URL in Safari (macOS) or iOS Safari — the splash should disappear and the app should render.
2. Confirm no `ReferenceError: requestIdleCallback` in the Safari Web Inspector console.
3. Sanity-check Chrome still works (chunk-reload listeners still attach via the `requestIdleCallback` branch).

## Files touched

- `src/main.tsx` — single helper + replace the unguarded `requestIdleCallback(...)` call.
