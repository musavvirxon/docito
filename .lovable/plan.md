## Goals

1. Doctor sees patient's camera, patient sees doctor's camera (two-way video).
2. Both sides see the other's screen share.
3. Click any tile (own camera, remote camera, screen share) to make it the large stage; the rest become small thumbnails.
4. Stop the call from crashing / "skipping incoming track after Room disconnected" / "createOffer with closed peer connection" errors.

## Root causes

- **Single remote slot**: `remoteVideoContainer` only shows ONE remote video at a time and gets overwritten. With multiple remote participants or when the remote republishes (camera re-toggle), the previous element is removed instead of tracked per-participant. Patient's camera shows because we attach into a single container; if the doctor publishes camera AFTER subscribing, the stage replaces only on unsubscribe events. We'll switch to a tile registry keyed by `participantSid + source`.
- **No focus/swap UI**: Local PiP is a fixed bottom-right thumbnail; there is no way to enlarge it. Same for screen share — currently absolutely positioned with `z-10` always-on overlay rather than swappable.
- **Crash on tab switch / unmount**: `useEffect` cleanup calls `room.disconnect(true)` synchronously while the connect promise is still in flight, leaving the PeerConnection in a half-closed state — hence "createOffer with closed peer connection" and "skipping incoming track after Room disconnected". We'll guard with a `cancelled` flag, await connect before disconnect, and remove all listeners before disconnecting.
- **Track re-attach loops**: `LocalTrackPublished` re-attaches every time a track republishes (e.g. mute/unmute). We'll dedupe by replacing children only when the element actually changes, and detach old elements via `track.detach()` first.

## Plan

### 1. Track registry (src/components/video/VideoRoom.tsx)

Replace the three fixed `ref` containers (`remoteVideoContainer`, `screenShareContainer`, `localVideoContainer`) with a `Map<string, HTMLDivElement>` keyed by tile id:

- `local:camera`
- `local:screen`
- `<participantSid>:camera`
- `<participantSid>:screen`

Maintain `tiles: TileMeta[]` state (id, label, kind: 'camera'|'screen', isLocal, participantSid). Render every tile as a `<div ref={(el) => registerTile(id, el)}>`.

Subscribe handlers (`TrackSubscribed`, `LocalTrackPublished`, `TrackUnsubscribed`, `LocalTrackUnpublished`, `ParticipantDisconnected`) push/pull tiles from the array and (re)attach the LiveKit track into the matching DOM node via a small `attachToTile(tileId, track)` helper.

### 2. Click-to-focus stage layout

```text
+-----------------------------+   +------+
|                             |   | tile |
|     FOCUSED TILE (big)      |   +------+
|                             |   | tile |
|                             |   +------+
+-----------------------------+   | tile |
                                  +------+
```

- `focusedTileId` state defaults to first remote camera, falls back to first screen share, then local.
- Big stage: render the focused tile full-area (`object-contain` for screen share, `object-cover` for camera).
- Sidebar (or bottom strip on mobile): all other tiles as 16:9 thumbnails with `cursor-pointer`; clicking sets `focusedTileId`.
- Local camera tile: mirror with `scaleX(-1)` only when it's NOT the focused tile bigger than ~480px (avoid mirrored screen capture).

### 3. Connection lifecycle hardening

In the connect `useEffect`:

- Track a `cancelledRef`. In cleanup: `cancelledRef.current = true`, remove all `.on(...)` listeners with `room.removeAllListeners()`, then `await room.disconnect(true).catch(() => {})` only if `room.state !== Disconnected`.
- Wrap connect in `try` and bail before `room.connect(...)` if `cancelledRef.current` flipped during token fetch.
- On `RoomEvent.Disconnected` (not just `ConnectionStateChanged`), surface a toast and switch to a "Rejoin" button instead of leaving the user staring at a black screen.
- Add a single 8-second connect timeout that calls `setStatus('error')` with a clear "Network or LiveKit unreachable" message rather than hanging.

### 4. Subscribe to remote tracks proactively

Set room options `{ adaptiveStream: true, dynacast: true, publishDefaults: { simulcast: true } }` and after connect, iterate `room.remoteParticipants` to attach any tracks that were already published before our subscribe handler bound (fixes the case where the doctor joins after the patient).

### 5. Toggle handlers (already gesture-driven — small fixes only)

- `toggleVideo` / `toggleAudio`: keep current `createTracks` call inside the click handler; do NOT `await` anything before it. Ensure we set `mediaStarted=true` even when the user only enables mic OR camera.
- `toggleScreenShare`: on stop, also remove the `local:screen` tile from registry; if it was focused, switch focus back to `local:camera` or first remote.

### 6. Misc UI

- Remove the giant fixed local PiP; it becomes a normal tile.
- Header keeps Live / Connecting / Disconnected badge plus participant count.
- Notes panel for doctor unchanged.
- Keep Apple-Tesla minimal styling (semantic tokens, no hard-coded colors).

## Files to modify

- `src/components/video/VideoRoom.tsx` — full rewrite of stage, tile registry, lifecycle.

No DB changes, no edge function changes.

## Out of scope

- Audio output device picker.
- Recording / transcription.
- Bandwidth indicator.
