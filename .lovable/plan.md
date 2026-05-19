# Clinic admin ↔ doctor profile: data, analytics & rules

The clinic admin dashboard at `/practices/dashboard` (`src/pages/AdminDashboard.tsx`) currently fetches doctors from the `doctors` table only. It never reads from `doctor_profiles_view` (where bio, languages, education, experience, fees, services, photo, ratings live), so the Provider section shows mostly empty fields. The provider detail view also has no controls to set rules/limits on a doctor, and the existing `practice_restrictions` table is practice-wide only, not exposed in this dashboard, and not enforced anywhere in booking/calendar.

## What we'll change

### 1. Pull real doctor profile data (data layer)
`src/hooks/useAdminDashboard.ts → fetchDoctors`
- Join the `doctors` rows with `doctor_profiles_view` (by `doctor_id`/`user_id`) to hydrate: `bio`, `languages`, `years_experience`, `education`, `certifications`, `consultation_fee`, `avatar_url`, `rating`, `total_reviews`, `services`, `verification_status`.
- Also fetch `doctor_availability` (working hours per doctor) and `procedures` linked to each provider, keyed by `doctor_id`, and attach to each doctor object.
- Keep the existing practice-scoping (`practice_id = practice.id`) and respect the per-doctor RLS.

### 2. Show that data in the provider profile (UI)
`src/pages/AdminDashboard.tsx` provider detail tabs (lines ~1028–1530):
- **Overview**: render real `bio`, `languages`, `years_experience`, `education`, `consultation_fee`, `avatar_url`, `verification_status` from the hydrated doctor.
- **Calendar**: replace the hardcoded "09:00–17:00 / Open" rows with the doctor's actual `doctor_availability` records; show blocked times from `blocked_times` for that `doctor_id`.
- **Procedures**: list the doctor's `procedures` (name, price, duration) instead of static text.
- **Analytics**: scope the existing `usePracticeInsights` result to `selectedProvider.id` so the charts reflect that doctor, not the whole clinic.
- **Reviews**: pull from the `reviews` table filtered by `doctor_id`.

### 3. Per-doctor rules & limitations (rules layer)
The current `practice_restrictions` table is one-row-per-practice. We'll extend it so admins can set rules per provider.

Migration:
- New table `doctor_restrictions` (`id`, `practice_id`, `doctor_id`, `working_hours_restriction jsonb`, `specialty_restriction jsonb`, `procedure_restriction jsonb`, `max_daily_appointments int`, `max_weekly_appointments int`, `requires_admin_approval boolean`, `notes`, timestamps). RLS: practice admins/staff can read/write rows where `practice_id` matches their practice (via `has_practice_admin_access(auth.uid(), practice_id)`); doctors can read their own row.
- Keep the existing practice-wide `practice_restrictions` as the fallback default.

UI:
- New component `src/components/dashboard/DoctorRulesCard.tsx`, reusing the controls already in `DoctorRestrictionsSettings.tsx` but bound to `(practice_id, doctor_id)`. Add it as a new "Rules & Limits" tab on the provider detail view in AdminDashboard.
- New hook `useDoctorRestrictions(practiceId, doctorId)` modelled on `usePracticeRestrictions`.

### 4. Enforce the rules
- `src/lib/booking.ts` (and the slot generator in `src/utils/TimeSlotCalculator.ts`): before returning bookable slots, load the merged restrictions for the doctor (`doctor_restrictions` overrides `practice_restrictions`) and filter out: slots outside `working_hours_restriction`, services not in `specialty_restriction.allowedSpecialties`, services in `procedure_restriction.blockedProcedures`, and any day where `max_daily_appointments` is already reached (count from `appointments` for that `doctor_id` + date).
- `PremiumDoctorCalendar` (already used by the provider Calendar tab): visually mark blocked days/slots from the same merged restrictions so the admin sees what patients see.
- Booking submission in `src/pages/AppointmentBooking.tsx` re-validates the same rules before insert and shows a clear error if violated.

### 5. i18n
Add English keys under `dashboard.admin.providers.rules.*` in `public/locales/en/dashboard.json` (and stub the other 10 languages with the English text as fallback) for the new tab title, field labels, save/cancel, and toast messages. No hardcoded English strings in the new component.

## Files touched

- `src/hooks/useAdminDashboard.ts` — hydrate doctors from `doctor_profiles_view`, `doctor_availability`, `procedures`.
- `src/pages/AdminDashboard.tsx` — render real fields in Overview/Calendar/Procedures/Analytics/Reviews; add "Rules & Limits" tab.
- `src/hooks/useDoctorRestrictions.ts` — new.
- `src/components/dashboard/DoctorRulesCard.tsx` — new (extracted/parameterised from `DoctorRestrictionsSettings.tsx`).
- `src/lib/booking.ts`, `src/utils/TimeSlotCalculator.ts`, `src/pages/AppointmentBooking.tsx` — enforce merged restrictions.
- `public/locales/*/dashboard.json` — new `providers.rules.*` keys.
- Migration: create `public.doctor_restrictions` + RLS policies + indexes on `(practice_id, doctor_id)`.

## Out of scope

- Redesigning the provider list grid.
- Changing how doctors are invited or linked to a practice.
- The doctor-side calendar UI (only the admin's read-only view of it).

