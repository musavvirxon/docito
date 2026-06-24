## Public profile + booking page fixes

### 1. Reviews not showing on public profile
`DoctorPublicProfile.tsx` fetches from a non-existent `reviews` table while reviews actually live in `appointment_reviews`. The `ReviewsSection` already uses `useAppointmentReviews` correctly, so the parent fetch is dead code that throws and produces a misleading error toast.
- Remove the `reviews` table fetch + local `reviews` state from `DoctorPublicProfile.tsx`.
- Let `ReviewsSection` (which already queries `appointment_reviews` by `doctorId`) drive the list and aggregate.

### 2. Consultation types — icon + label visible, all info shown
`PremiumHeroSection` only renders a "video consult" badge. Replace with a small set rendering every `consultation_types` value with an icon + label:
- `video` → Video icon, "Video"
- `in_person` / `in-person` → MapPin icon, "In‑person"
- `messaging` → MessageSquare icon, "Messaging"
- `home_visit` → Home icon, "Home visit"
Also keep avatar visible (already wired) and ensure rating / fee / languages / years rows remain shown even when individual fields are null (skip nulls instead of hiding whole block).

### 3. Action buttons require sign-in
In `DoctorPublicProfile.tsx`, wrap `handleBookClick`, `handleMessageClick`, `handleToggleSave`, and `handleShare` with an auth check using `supabase.auth.getUser()` (or the existing `useAuth` context). If no user → `navigate('/auth?returnTo=' + encodeURIComponent(currentPath))` and toast "Sign in to continue". Share is fine for anyone, but per request gate it too.

### 4. Booking page — doctor name not visible
`doctor_profiles_view` sometimes returns `full_name = null`. Add a fallback:
- After loading from `doctor_profiles_view`, if `full_name` is empty, query `doctor_public_profile_view` (same shape, anon-safe) by `id` and use its `full_name`.
- Use that resolved name for both the header card and the page title.

### 5. Swap "Request a procedure" with visible Available procedures
Replace the single Select dropdown in the "Request a procedure (optional)" card with a grid of selectable procedure cards (name, category badge, price, duration), mirroring the public profile's `ProceduresSection` layout but click‑to‑select:
- Selecting a card sets `selectedProcedureId` and auto-applies its duration (existing behavior).
- Include a "No specific procedure" option as the first card.
- Empty state stays as today.

### 6. In‑person appointment type missing
Currently the In‑person radio renders but is `opacity-50 pointer-events-none` when `practice_id` is null, which on small/locked layouts reads as "missing". Always render In‑person as a real, selectable option:
- Keep the lock icon and helper text when `practice_id` is null, but allow selection (the booking RPC already enforces validity). Or, simpler: render In-person without the disabled wrapper so users can see and pick it; show the "requires verified location" note inline.

### Files to touch
- `src/pages/doctor/DoctorPublicProfile.tsx` — drop dead reviews fetch; auth-gate handlers.
- `src/components/doctor/public/PremiumHeroSection.tsx` — consultation type chips with icons.
- `src/pages/AppointmentBooking.tsx` — doctor name fallback; procedure grid; always-visible in-person type.

### Out of scope
No DB migrations, no edge function changes, no changes to messaging or auth pages themselves.
