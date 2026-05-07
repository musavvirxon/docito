## Goal

Fix 12 bugs in the video call stack causing camera "in use" crashes, blank tiles, state desync, and silent disconnects. All changes are scoped to:

- `src/components/video/VideoWaitingRoom.tsx`
- `src/components/video/VideoRoom.tsx`
- `supabase/functions/livekit-token/index.ts`

No DB changes. No new dependencies.

---

## 1. `VideoWaitingRoom.tsx` — Bug #1 (camera in-use crash)

- Replace `mediaStream` state with `mediaStreamRef = useRef<MediaStream | null>(null)`. Keep `useState` only to drive UI re-render flags (`hasStream` boolean).
- In the `useEffect` initializer: assign acquired stream to `mediaStreamRef.current`, attach to `<video>`, then set `hasStream(true)`.
- Cleanup function reads from the ref (always fresh) and stops every track, then nulls the ref.
- `handleJoin()` performs the same teardown synchronously before invoking `onJoin()` so `VideoRoom`'s `getUserMedia` finds the device free.
- Toggle handlers read tracks from the ref.

## 2. `VideoRoom.tsx` — Bugs #2–#11

### Bug #2 — Pending-attach queue (blank tiles)
- Add `pendingAttachRef = useRef<Set<string>>(new Set())`.
- `upsertTile()` stores the track in `trackRegistry`, adds the id to `pendingAttachRef`, and schedules state update; **remove the `setTimeout(tryAttach, 0)`**.
- `registerNode(id, el)` (already exists) — when `el` is non-null and `pendingAttachRef` contains `id`, call `tryAttach(id)` and delete from the set. This guarantees attachment runs after React commits the DOM.
- Also re-run `tryAttach` from a `useLayoutEffect([tiles])` as a safety net.

### Bug #3 — Screen share stopped via browser UI
- In `handleLocalUnpublished`, when `track.source === ScreenShare`, always set `setIsScreenSharing(false)`. Already partially handled — also subscribe to `RoomEvent.LocalTrackUnpublished` for the local participant explicitly and listen to the `Track.Event.Ended` event on the local screen-share track inside `toggleScreenShare()` to flip `isScreenSharing` immediately when the browser's "Stop sharing" button fires.

### Bug #4 — Stale closures in mic/camera toggles
- Switch `isAudioOn`, `isVideoOn`, `isScreenSharing` to refs (`audioOnRef`, etc.) mirrored from state via a small `useEffect`. Toggle handlers read the ref to compute `next`, then call `setX(next)` and update the ref synchronously. Removes dependency on stale closure values.

### Bug #5 — Re-attach after auto-reconnect
- Add handler for `RoomEvent.Reconnected`: iterate `room.remoteParticipants` and re-invoke `handleRemoteTrack` for every subscribed publication; also re-attach local tracks (camera/screen) by calling `tryAttach` for each id in `trackRegistry`. Set `setStatus('connected')`.
- Add handler for `RoomEvent.Reconnecting` → `setStatus('connecting')` (already covered via ConnectionStateChanged but be explicit).

### Bug #6 — `MediaDevicesError`
- Add `room.on(RoomEvent.MediaDevicesError, (err) => explainMediaError(err, 'Media device error'))`. Also flip the affected toggle state off so the UI is consistent.

### Bug #7 — Partial `startMedia` failure
- Rewrite `startMedia`: enable mic and camera independently inside separate try/catch blocks. Set `isAudioOn`/`isVideoOn` only after each succeeds. Set `mediaStarted = true` if at least one succeeded. Show a toast naming exactly which device failed.

### Bug #8 — Duplicate `<audio>` elements (echo)
- In `attachTrackToNode`, when `track.kind === Audio`, remove existing `<audio>` children of the node before appending. Same pattern already used for `<video>`.

### Bug #9 — Local video must be muted
- In `attachTrackToNode`, if the attached element is `HTMLMediaElement` and the track belongs to the local participant (pass an `isLocal` flag through, or check `track instanceof LocalTrack`), set `el.muted = true`. Apply unconditionally for any local audio/video tile to prevent feedback.

### Bug #10 — `visibilitychange` recovery on mobile
- Add a top-level `useEffect` listening to `document.visibilitychange`. When tab becomes visible again and `roomRef.current` is connected but `isVideoOn`/`isAudioOn` ref is true while `localParticipant` has no published camera/mic track, call `setCameraEnabled(true)` / `setMicrophoneEnabled(true)` to republish.

### Bug #11 — `reconnectPolicy`
- Pass a `reconnectPolicy` to the `Room` constructor with `maxRetries: 10` and an exponential `nextRetryDelayInMs` (e.g. `Math.min(30000, 1000 * 2 ** ctx.retryCount)`).

## 3. `supabase/functions/livekit-token/index.ts` — Bug #12

- Change `exp: now + 3600` → `exp: now + 4 * 3600` (4 hours). Update the inline comment.

---

## Out of scope

- No UI restyling. No new buttons. Apple-Tesla minimal aesthetic preserved.
- No changes to `useVideoConsultation` or finance/appointment code.
- No DB migrations.

## Verification

1. Start preview. Open consultation as patient → waiting room shows preview → click Join → no "device in use" toast.
2. Doctor and patient both publish camera + screen share simultaneously; all tiles render, click-to-focus works.
3. Stop screen share via browser's native "Stop sharing" pill → button in UI flips back to inactive.
4. Toggle mic 5× rapidly → state stays in sync (no stuck state).
5. Throttle network in DevTools to force LiveKit reconnect → on recovery, all video tiles re-render.
6. Background mobile tab > 30 s → return → camera resumes automatically.
7. Run a 90-min idle session → token does not expire (was 60 min).
