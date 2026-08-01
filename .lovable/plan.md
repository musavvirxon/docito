# Patient profile completion + phone required before booking

## Problem

- `/patient/profile` is not a registered route today (Patient Dashboard links to it, so it lands on Not Found).
- A patient can book an appointment with no phone number on file, so clinics have no way to reach them.
- The 043/u medical card needs full name, gender, date of birth, phone, profession and address — these fields exist on the patient record but there is no single place for a patient to fill them in.

## What we will build

### 1. A real Patient Profile page at `/patient/profile`

- New page registered on both the plain and language-prefixed route trees, so `/patient/profile` and `/ru/patient/profile` both work.
- Signed-in patients only; the page always loads the logged-in patient's own record (each patient sees and edits only their own data, enforced by the existing row-level rules).
- Sections:
  - **Identity & contact**: full name, phone (validated), email (read-only), date of birth, gender.
  - **043/u details**: profession, address.
  - **Preferences**: language, timezone, preferred currency (reusing the existing cards).
- A completeness meter at the top ("Profile 4/6 complete") listing which fields are still missing for booking and for the 043/u form.
- Fully localized (EN / RU / UZ) using the existing translation setup.

### 2. Phone required before booking

- When a patient opens the booking flow, we check their stored phone number.
- If it is missing or invalid, a **"Add your phone number" dialog** appears before they can confirm: phone field with validation, plus optional quick-fill of the other missing 043 fields, and a link to the full profile page.
- Saving the number writes it to their profile and returns them to the booking step they were on. Booking confirm stays disabled until a valid phone exists.
- The same guard runs in the booking popup used from search/doctor pages and on the standalone booking page, so there is no path around it.

### 3. 043 form benefits

Because profession, address, DOB and gender are now captured on the profile, the medical card generator will find them populated instead of printing blank lines.

## Technical notes

- No database schema change is needed: `profiles` already has `phone`, `date_of_birth`, `gender`, `address`, `profession`, `full_name`.
- New `src/pages/PatientProfile.tsx`, routes added in `src/App.tsx` (both route groups), lazy-loaded like the other pages.
- New shared hook `useProfileCompleteness` returning missing required/recommended fields, used by both the profile page meter and the booking guard.
- New `src/components/booking/RequirePhoneDialog.tsx`; wired into `src/components/booking/AppointmentBookingPopup.tsx` and `src/pages/AppointmentBooking.tsx`.
- Phone validation reuses `src/lib/phone/phone.ts` (`validatePhone` / `normalizePhone`) and the existing `PhoneInput` component; stored normalized in E.164.
- Translation keys added to `public/locales/{en,ru,uz}/booking.json` and a `patientProfile` namespace/section.

## Open choice

Required to book: **phone only** (hard block). The other 043 fields are prompted but skippable. Tell me if you want DOB/gender/address to be hard-blocking too.
