## Goal

Six related changes across verification, currency, booking link, appointment summary PDF, patient profile cross-entity view, and i18n.

## 1. Use existing verification page (drop the popup)

- **File**: `src/components/doctor/DoctorVerificationStatusCard.tsx`
- Replace the local `<VerificationDialog>` (which mounts `DoctorProfileVerificationSection` in a Dialog) with `navigate('/doctor/verification')` — the existing full page at `src/pages/doctor/DoctorVerification.tsx` already uses `getCountryRequirements` with `**GLOBAL_DOCUMENTS` fallback** (medical license + medical degree + IDs are already required for unknown countries — no config change needed).
- Remove the `verificationOpen` state and `<VerificationDialog>` component.
- Apply same pattern to lab/pharmacy/imaging/practice status cards if they use a popup (audit + fix).

## 2. Multi-currency support with profile-level default

### Schema (migration)

- Add `preferred_currency text default 'USD'` to `public.profiles`.
- Add a **lookup** `public.supported_currencies` (code, symbol, name, locale) seeded with the currencies for our 11 supported languages: USD, EUR, GBP, JPY, KRW, RUB, TRY, UZS, CNY, SAR, BRL, MXN, CAD, AUD, CHF, INR.

### Frontend infrastructure

- **New** `src/lib/currency.ts`: `formatCurrency(amountCents, currency, locale)`, `convertCurrency(amount, from, to)` (using a static rate map for now; extensible to a live FX edge function later), `SUPPORTED_CURRENCIES` constant.
- **New** `src/contexts/CurrencyContext.tsx`: loads `profiles.preferred_currency`, exposes `{ currency, setCurrency, format(cents, sourceCurrency?) }`. When a record stores its own currency (e.g. `billing_transactions.currency`), `format` converts to the user's preferred display currency and shows the converted value with original in tooltip.
- **New** `src/hooks/useCurrency.ts`: thin wrapper.

### UI surfaces to migrate (replace local `formatMoney`/hardcoded `$`)

- `src/pages/Profile*` — add a Currency `<Select>` bound to `preferred_currency`.
- Treatment plans (`EnhancedCreate/DetailTreatmentPlanModal`, `treatment-plan-generate-pdf` edge function — accept `displayCurrency` parameter).
- Referrals (`referral-generate-pdf`).
- Appointments (booking, fee display, patient billing).
- Bills / invoices (`patient-billing`, `clinic-billing`, `facility-billing`).
- Finance analytics (`finance-analytics`, `practice-analytics`, `entity-finance-summary`).
- Pharmacy/Lab/Imaging settings keep their **billing currency** (the entity charges in), but the **viewer** sees converted amounts via context.

## 3. Booking link → `docito.app`

- **File**: `src/components/doctor/DoctorProfileSection.tsx` line 90-94: replace `${window.location.origin}` with a constant `PUBLIC_BOOKING_ORIGIN = 'https://docito.app'`.
- **New** `src/lib/booking.ts` exporting `getBookingUrl(slug)` — single source of truth.
- Update `src/components/search/BookingModal.tsx` (line 21) and any other `/book/${id}` builders to use the helper.

## 4. Appointment summary PDF

### Edge function

- **New** `supabase/functions/appointment-summary-pdf/index.ts` (modeled on `treatment-plan-generate-pdf`): accepts `appointment_id`, fetches:
  - Appointment (date, time, duration, doctor, facility, type, status)
  - Diagnoses (`appointment_diagnoses` / clinical items)
  - Procedures performed (`appointment_procedures` / `treatment_plan_procedures` linked to this appointment)
  - Recommendations (notes, follow-up flags)
  - Prescriptions issued in this appointment (with items)
  - Bills (`billing_transactions` filtered by `appointment_id`)
  - Vitals if present
- Renders branded PDF with QR (prefix `AS-`), localized labels, displayed in the requesting user's `preferred_currency`.
- Returns PDF bytes.

### UI integration

- **New** `src/lib/api/appointment-summary-api.ts` → `downloadAppointmentSummaryPdf(appointmentId)`.
- Add **"Download Summary"** button in:
  - `AppointmentSession.tsx` (after end session)
  - Patient appointment history rows (`PatientProfileView.tsx`)
  - Doctor calendar appointment detail
  - Admin appointments list

### DB

- Optional log table `appointment_summary_documents` for audit (verification code, URL).

## 5. Cross-entity patient profile (full clinical + financial view)

Currently `PatientProfileView` shows clinical data only. Expand it so any treating entity (doctor / clinic admin / pharmacy / lab / imaging) sees **everything that entity has provided** plus aggregate analytics scoped to that entity.

- **Component**: extend `src/components/appointments/PatientProfileView.tsx` with new tabs gated by viewer entity:
  - **Clinical** (existing): appointments, prescriptions, lab, imaging, diagnoses, procedures.
  - **Billing** (new): all `billing_transactions` for this patient where `entity_id = viewer's entity` — invoices, payments, outstanding.
  - **Insurance** (new): claims, coverage on file, copay history (`insurance_claims` filtered by entity).
  - **Analytics** (new): patient-level KPIs scoped to the viewer entity — total spend, visit count, LTV, no-show rate, last visit, next appointment.
  - **Activity** (new): timeline of every interaction this entity has had with this patient.
- **New hook** `src/hooks/usePatientEntityHistory.ts`: takes `(patientId, entityType, entityId)` and returns the above grouped data.

### RLS / Security

- All queries scoped by `entity_id = viewer's entity_id` so a clinic only sees what it provided. Pharmacies see prescriptions they filled, labs see orders they processed, etc.
- Verify existing RLS on `billing_transactions`, `insurance_claims`, `prescriptions`, `lab_orders`, `imaging_orders` already restricts by `entity_id` (most do; tighten any that don't).
- New SECURITY DEFINER helper `get_patient_entity_summary(patient_id, entity_id, entity_type)` for the analytics aggregation to avoid N+1.

## 6. i18n: English translations everywhere

- Audit hardcoded English strings across: `DoctorVerificationStatusCard`, `PatientProfileView`, `DoctorProfileSection`, `BookingModal`, all admin/clinic/staff dashboards, treatment + referral modals, settings panels.
- Add new keys to existing namespaces (`dashboard.json`, `patients.json`, `verification.json`, `common.json`, `popups.json`) with English values. New keys grouped by feature: `currency.*`, `appointmentSummary.*`, `patientProfile.tabs.*`, `verification.statusCard.*`.
- Wrap every visible string with `useTranslation(ns)` and `t('key', 'English fallback')`.
- Skill: leave other 10 locales to inherit English fallback (existing pattern); copying English keys to other locale files keeps key parity but values stay English until translators fill them.

## Files

**New**

- `src/lib/currency.ts`, `src/contexts/CurrencyContext.tsx`, `src/hooks/useCurrency.ts`
- `src/lib/booking.ts`
- `src/lib/api/appointment-summary-api.ts`
- `src/hooks/usePatientEntityHistory.ts`
- `supabase/functions/appointment-summary-pdf/index.ts`
- Migration: `add_preferred_currency_and_supported_currencies`

**Edited**

- `src/components/doctor/DoctorVerificationStatusCard.tsx` (remove popup, navigate to page)
- `src/components/doctor/DoctorProfileSection.tsx` + `src/components/search/BookingModal.tsx` (docito.app booking origin)
- `src/components/appointments/PatientProfileView.tsx` (new tabs)
- `src/pages/Profile.tsx` (currency selector)
- `src/App.tsx` (mount `CurrencyProvider`)
- All currency-displaying components migrated to `useCurrency().format(...)`
- `supabase/functions/treatment-plan-generate-pdf`, `referral-generate-pdf`, `invoice-generate-pdf` (accept `displayCurrency`)
- 11 × `public/locales/en/*.json` (new keys; English values)

## Question

Currency conversion approach — should I:

- **(a)** Use a **static rate table** seeded into `supported_currencies` (simple, manual updates), or
- **(b)** Add a daily cron edge function pulling from a free FX API (exchangerate.host)?

I choose (b) - do it in a way i do not have to do anything. No API, no cost, free, automatic.

&nbsp;