## Root cause

The video call runs inside the Lovable **preview iframe**, which does not set `allow="camera; microphone; display-capture"`. Even when the browser has granted camera/mic permissions to `docito.app`, the iframe's Permissions Policy blocks `getUserMedia`/`getDisplayMedia`, so LiveKit's `setCameraEnabled` / `setMicrophoneEnabled` / `setScreenShareEnabled` throw `NotAllowedError`. That's why the toast says "permission denied" even though the browser granted access, and why neither the local self‑view nor screen share ever appears.

Secondary issues in `VideoRoom.tsx`:
- `startMedia` awaits mic before requesting camera, breaking the user‑gesture chain that some browsers require for the second `getUserMedia`.
- No proactive `navigator.permissions.query` check, so the failure mode isn't actionable.
- The self‑view depends on the LiveKit slot getting a published local track; if publishing fails (iframe policy), the user never sees their own camera even as a preview.

## Fixes

### 1. `src/components/video/VideoWaitingRoom.tsx`
- On "Start camera & microphone" click, first request a **local preview stream** directly with `navigator.mediaDevices.getUserMedia({ audio: true, video: true })` inside the click handler (no `await` before it).
- Attach that stream to a `<video muted autoplay playsinline>` element so the user immediately sees themselves — this is the local preview even before joining LiveKit.
- Detect environment problems and show inline actionable errors instead of the generic toast:
  - `location.protocol !== 'https:'` and not `localhost` → "Secure context required".
  - `window.self !== window.top` and `document.featurePolicy?.allowsFeature('camera') === false` (or the getUserMedia call throws `NotAllowedError` on the first try) → show a banner: "Camera/microphone are blocked inside the preview. Open the call in a new tab." with an **Open in new tab** button that navigates to the same URL on `window.top`.
  - `navigator.permissions.query({ name: 'camera' })` / `'microphone'` returning `denied` → "Blocked in browser settings. Click the lock icon in the address bar to allow camera & microphone."
- Stop the preview stream (`track.stop()`) right before handing off to `onJoin`, so LiveKit can acquire the devices cleanly.

### 2. `src/components/video/VideoRoom.tsx`
- Rewrite `startMedia` to acquire mic + camera in **a single** `getUserMedia({ audio: true, video: true })` call inside the click handler, then feed the tracks to LiveKit via `room.localParticipant.publishTrack(new LocalAudioTrack(audioTrack))` / `publishTrack(new LocalVideoTrack(videoTrack))`. This preserves the user gesture and avoids the two‑step failure.
- On any `NotAllowedError`, check `window.self !== window.top` and, if true, surface the same "Open in new tab" affordance as the waiting room.
- Add an always‑mounted mirrored **self‑view PIP** (bottom‑left) that binds directly to the local camera track (`room.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack`). This guarantees the doctor/patient can see their own camera even if the slot layout is currently focused on the remote participant.
- For screen share, keep `setScreenShareEnabled` but wrap in the same iframe‑policy detection so the user gets a clear "Open in new tab to share your screen" message instead of a bare `NotAllowedError`.
- Ensure the screen‑share slot renders for both roles (currently only maps for `doctor`); add `patient` → `doctor-screen` fallback so a patient's shared screen is visible to the doctor.

### 3. No backend / schema changes

Only two frontend files change. No migrations, no edge‑function edits, no new dependencies.

## Verification

1. In the Lovable preview: clicking "Start camera & microphone" should now show the "Open in new tab" banner instead of a silent denial.
2. Opening the call at `https://docito.app/video/...` in a normal tab: local self‑view appears immediately after clicking Start, remote video appears when the other party joins, screen‑share button opens the OS picker and the shared screen is visible to the other side.
3. Denying permission in the browser prompt shows the actionable "unblock in address bar" message instead of the generic toast.