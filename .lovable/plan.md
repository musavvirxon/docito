# Show room on queue display (opt-in toggle)

Add a per-room switch in the Add/Edit Room (and Cabinet) dialog that controls whether the room appears on the public waiting-room queue display. Off by default; existing rooms stay hidden until switched on.

## What changes

1. **Room form** — a new "Show on queue display" switch under the assigned-doctor field, with a short hint explaining that patients only see rooms that are turned on. Defaults to off for new rooms and cabinets.
2. **Queue display** — the public display only lists rooms with the toggle on, and only shows queue entries for those rooms. If no room is turned on, the display shows its existing "no rooms set up" message.
3. **Room list / floor plan** — no visual change beyond the value being saved and re-loaded when editing a room.
4. **Translations** — new label and hint keys in EN, RU, and UZ `rooms.json`.

## Technical details

- Migration: add `show_on_display boolean not null default false` to `public.clinic_rooms`.
- Update `public.get_queue_display(_token)` so both the `rooms` and `queue` sub-selects filter on `r.show_on_display = true` (the queue filter joins `clinic_rooms` on `a.room_id`).
- `src/hooks/useRoomBed.ts`: add `show_on_display` to the `ClinicRoom` interface and include it in the room mapping.
- `src/components/rooms/AddRoomModal.tsx`: add `show_on_display` to form state (default `false`), hydrate from `editRoom`, render a shadcn `Switch`, and pass it through `onSave`.
- i18n keys: `addRoomModal.showOnDisplay`, `addRoomModal.showOnDisplayHint` in `public/locales/{en,ru,uz}/rooms.json`.
