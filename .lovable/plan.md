# Low-bandwidth, lag-free video consultations

Goal: the consultation stays usable on slow or unstable connections — audio never drops, video degrades gracefully instead of freezing, and reconnects are fast.

All changes are in `src/components/video/VideoRoom.tsx` (plus a few i18n strings). No database or edge function changes.

## 1. Bandwidth-aware publishing

Today the room publishes camera at browser defaults with simulcast on. Tune it:

- Camera capture default: 640x360 @ 24fps (h360 preset) with simulcast layers h180 + h360, so weak receivers get the tiny layer.
- Screen share: 1080p at 5fps with `contentHint: 'detail'` — text stays readable while using far less bitrate than 30fps.
- Explicit publish bitrates: audio ~24 kbps (opus mono, DTX + red enabled so silence costs nothing and packet loss is recoverable), video max ~500 kbps at h360.
- Backup codec / `degradationPreference: 'maintain-framerate'` for screen share and `maintain-resolution` off for camera, so motion stays smooth rather than sharp-and-frozen.

## 2. Adaptive quality by measured connection

- Listen to `RoomEvent.ConnectionQualityChanged` for the local participant.
- On `poor`: drop camera capture to 320x180 @ 15fps and cap publish bitrate (~150 kbps); show a subtle "Low bandwidth — video reduced" indicator.
- On sustained `poor` (about 15s) with video on: auto-disable the camera, keep audio, and toast "Switched to audio-only to keep the call stable" with a one-tap button to re-enable video.
- On recovery to `good`/`excellent`: restore the normal 640x360 profile automatically.
- Also read `navigator.connection.effectiveType`/`saveData` at join and start in the low profile on 2g/3g or data-saver.

## 3. Subscription control (receive side)

- Keep `adaptiveStream` and `dynacast` (already on), and additionally set video quality per visible slot: the focused tile subscribes at high quality, thumbnails at low.
- When a tile is not visible (collapsed/other tab), unsubscribe its video track; audio always stays subscribed.
- Pause remote video subscriptions while the browser tab is hidden, resume on return (audio untouched).

## 4. Faster, more resilient connect

- Fetch the LiveKit token and the user's media permissions in parallel instead of sequentially, so joining feels instant.
- Enable `room.prepareConnection(url, token)` right after the token arrives to warm up DNS/TLS/ICE before the user presses "Start camera & microphone".
- Publish audio first and video second (already the order) but do not await video before marking the user connected.
- Keep the existing reconnect policy but shorten the first retries (200ms, 400ms, 800ms …) so brief drops recover in under a second.

## 5. Connection feedback in the UI

- Small signal indicator in the room header driven by `ConnectionQuality` (excellent / good / poor) plus current mode (HD, low bandwidth, audio-only).
- Reconnecting banner instead of the generic "connecting" state, so users know the call is not lost.

## Technical notes

- Uses `livekit-client` APIs already in the project: `VideoPresets`, `ScreenSharePresets`, `Room.prepareConnection`, `RoomEvent.ConnectionQualityChanged`, `setVideoQuality` / `setEnabled` on `RemoteTrackPublication`, and `LocalVideoTrack.restartTrack` for capture-profile switching.
- New i18n keys (EN, RU, UZ) for: low-bandwidth notice, auto audio-only switch, quality restored, reconnecting banner.
- No change to role resolution, slot mapping, or the mic-required / camera-optional join rules established earlier.
