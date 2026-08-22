# Allow doctors to book appointments at any time (including the past)

Doctors currently cannot place an appointment on a past time slot. This removes that restriction everywhere in the doctor-side booking flow.

## Changes

1. Day calendar grid (`src/components/doctor/calendar/DayView.tsx`)
   - Remove the "Past" placeholder shown on today's earlier slots. Every non-occupied working slot becomes a clickable "+" slot that opens the appointment modal.

2. Manual booking modal (`src/components/doctor/ManualBookAppointmentModal.tsx`)
   - Remove the `past` disabling of time buttons for today, so all times are selectable.
   - Remove the date-picker restriction `date < startOfDay(new Date())` so earlier dates can be chosen.

## Notes

- Existing rules stay intact: booked, blocked, break and outside-working-hours slots are still not bookable, and overlap checks remain.
- Patient-facing booking is untouched — patients still cannot book in the past.
- If a doctor-created appointment ever routes through the `book-appointment` edge function (which rejects past times with `PAST_TIME`), that path would also need a doctor-only exemption; the doctor modal writes appointments directly, so no backend change is planned unless testing shows otherwise.
