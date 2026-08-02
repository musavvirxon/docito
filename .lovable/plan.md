# Tooth chart layout, dashboard reload fix, resizable video tiles

## 1. Treatment plan tooth chart — procedures above the teeth

Today the chart shows the two arches and then a separate "Tooth # / Procedure(s) / Status" table underneath.

Change:
- Remove the table under the arches.
- Render each planned procedure directly above the tooth it belongs to: a small stacked list of labels sitting on top of each tooth chip (procedure name shortened, colored by its category bucket, status shown as a subtle dot/shade).
- Upper arch: labels stack above the tooth. Lower arch: labels sit under the tooth so they don't collide with the upper row.
- Teeth with more than 2 procedures show the first two plus a "+N" marker; the full list stays available in the existing popover on click.
- Legend and the permanent/primary switcher stay as-is.
- Full-mouth/general procedures (no tooth assigned) get one compact strip under the chart, since they belong to no tooth.
- The same layout applies in the doctor detail modal and the patient read-only modal (both use this one component).

Note: the PDF export already draws its own chart and table server-side — say the word if you want the PDF table removed too; this plan changes the in-app chart only.

## 2. Dashboard breaks on reload / can't get back in

Two problems in the auth bootstrap, both on the hard-refresh path:

- On startup the code calls `supabase.auth.getUser(token)` to validate the stored session, and on ANY error — including a transient network failure or a slow response — it calls `signOut({ scope: "local" })` and wipes local auth. That matches the "I have to sign out and sign in again" symptom.
- The `onAuthStateChange` callback awaits a chain of Supabase calls (profile reads, `updateUser`, `upsert`) inside the callback. Supabase warns this can deadlock the auth client, which leaves the dashboard stuck on the loading spinner after a reload.

Fix:
- Only clear the session when the validation error is a real auth failure (invalid/expired JWT, 401/403). Network/timeout errors keep the session and let the normal refresh flow retry.
- Make `onAuthStateChange` synchronous: capture the event/session, then run `runBootstrap` outside the callback (deferred via a microtask/`setTimeout(0)`), so the auth client is never blocked.
- De-duplicate the double bootstrap: the explicit `getSession()` call and the `INITIAL_SESSION` event both run `runBootstrap` today. Guard so only one initial run happens.
- Keep the existing safety timeout but stop it from flipping `bootstrapped` while a bootstrap is genuinely in flight.

After this, verify with a browser check: load a dashboard route while signed in, hard reload, confirm the dashboard renders without a re-login.

## 3. Video consultation — resizable tiles and self-view control

In `VideoRoom.tsx` the three slots (doctor camera, patient camera, screen share) are fixed-size: the focused one fills the stage and the others are locked to a `w-40 / lg:w-52` strip.

Add:
- **Resizable picture-in-picture tiles.** Each non-focused tile gets a drag handle on its inner corner; dragging resizes it between a small and large bound. Size is kept per-slot in component state and persisted to `localStorage` so it survives a rejoin. A double-click resets a tile to the default size. Resizing only changes CSS on the existing tile container, so no track is detached and the stream never blinks.
- **Self-view toggle.** A new control in the bottom toolbar ("Show my camera" / eye icon) hides or shows the viewer's own camera tile. Hidden means the tile is visually collapsed only — the local track stays published, so the other side still sees you. State persists in `localStorage`.
- When the local tile is hidden, the remaining tiles reflow so there is no gap.
- New i18n keys for the toggle and resize labels in EN/RU/UZ.

## Technical notes

- Files: `src/components/dental/TreatmentPlanToothChart.tsx`, `src/contexts/AuthContext.tsx`, `src/components/video/VideoRoom.tsx`, plus `public/locales/{en,ru,uz}/dashboard.json` and `common.json` for new keys.
- No database migration and no changes to LiveKit token/edge functions.
- Tile sizing uses inline width/height on the wrapper div; slot nodes and `slotTrackRefs` are untouched so the existing "never unmount a slot" guarantee holds.
