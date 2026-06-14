# Plan: Full i18n Coverage for Patient, Doctor & Clinic Admin Dashboards

## Current State (audit)

| Area | Files w/ `useTranslation` | Total |
|---|---|---|
| `src/pages/PatientDashboard.tsx` | 1/1 (partial keys) | 1 |
| `src/pages/DoctorDashboard.tsx` | 1/1 | 1 |
| `src/pages/AdminDashboard.tsx` | 1/1 | 1 |
| `src/components/doctor/**` | 71/75 | 75 |
| `src/components/dashboard/**` (clinic admin shell) | 13/29 | 29 |
| `src/components/patient/**` | 4/18 | 18 |
| `src/components/patient-dashboard/**` | 0/11 | 11 |
| `src/components/clinic/**` | 0/7 | 7 |
| `src/components/admin/**` | 1/3 | 3 |

Doctor dashboard is largely covered. Patient & clinic admin surfaces are the main gap (~55 files with hardcoded English strings).

Locales already exist for 11 languages: `en, de, es, pt, ja, ko, tr, uz, ru, ar, zh` (+ namespaces `dashboard`, `admin`, `patients`, `doctor*`, `finance`, `common`, etc.).

## Scope

In: visible strings (labels, buttons, headings, toasts, empty states, table headers, modal copy, tab names, tooltips) inside the three dashboards and their subcomponents.

Out: backend/error codes from Supabase, console logs, dev-only text, PDF generators (already parameterized), finance bookkeeping panels (kept on source currency/locale per existing policy).

## Approach

### Phase 1 — Namespace layout
Reuse existing namespaces; add only what's missing.
- `dashboard` → clinic admin shell + `src/components/dashboard/*` + `src/components/admin/*` + `src/components/clinic/*` (extend existing `dashboard.json`).
- `patients` → patient dashboard shell + `src/components/patient-dashboard/*` + `src/components/patient/*` (extend existing `patients.json` significantly).
- `doctor` → fill the 4 remaining doctor components.

### Phase 2 — String extraction (per file)
For each file lacking `useTranslation`:
1. Add `import { useTranslation } from "react-i18next"` and `const { t } = useTranslation("<ns>")`.
2. Replace literal JSX text, `placeholder=`, `aria-label=`, `title=`, toast messages, and `Intl`-free format strings with `t("path.key")`.
3. Use interpolation (`{{count}}`, `{{name}}`) for dynamic values; pluralization where applicable.
4. Keep `defaultValue:` fallbacks for safety on first render.

Date/number/currency: keep current helpers (`useCurrency`, `formatAppointmentForViewer`, `date-fns` locales) — no change.

### Phase 3 — Key authoring
- Add new keys to `public/locales/en/<ns>.json` first (source of truth).
- Mirror keys to the other 10 locales. Initial values: human-translated for `en`; machine-aided translations for `de, es, pt, ja, ko, tr, uz, ru, ar, zh`, then a quick pass for high-visibility surfaces (tab names, primary CTAs, empty states).
- RTL (`ar`) re-checked for any direction-sensitive copy.

### Phase 4 — Verification
- `rg "[A-Z][a-z]+ [A-Z]?[a-z]+"` style sweep over touched files to catch leftover literals.
- Manual switch through `en → ar → ja` in preview for each dashboard's main tabs.
- Build check.

## Files to update (high level, ~55)

Patient surface (`patients` ns):
- `src/pages/PatientDashboard.tsx` (extend keys)
- `src/components/patient-dashboard/{PatientDashboardHeader,PatientDashboardView,QuickOverviewCards,EditPatientModal}.tsx` + `tabs/*`
- `src/components/patient/{PatientBilling,PatientDiagnoses,PatientMedicalRecords,PatientRecordsUnified,PatientReferralsSection,PatientSelector,PatientSettingsPanel,PatientTestResultsSection,PatientTreatmentPlanModal,PatientTreatmentPlans,PatientTreatmentPlansSection,SearchBar,SearchResults,MedicalHistory,DoctorSearchSection,CreatePatientModal,CreateFacilityPatientModal,FacilityPatientSelector}.tsx`

Clinic admin surface (`dashboard` ns):
- `src/components/dashboard/*` — 16 remaining files (`AddLocationModal, AddServiceModal, ClinicBillingSection, ComprehensiveRegistrationModal, ContentCard, CreateClinicModal, DashboardFooter, DashboardTopBar, DashboardTopNav, DoctorRestrictionsSettings, EmptyState, InviteProviderModal, JoinRequestsSection, PageHeader, PracticeAnalyticsSection, SecuritySettings, SettingsDialog, StatsGrid, VerificationDocumentsModal, VerificationSuccessModal, ViewRequirementsModal`).
- `src/components/clinic/*` — all 7 files.
- `src/components/admin/{TransactionsTable, patients/*}.tsx`.

Doctor surface (`doctor` ns):
- 4 remaining files in `src/components/doctor/**` (identify via `rg -L useTranslation`).

## Delivery order

1. Patient dashboard (biggest gap, user-facing) → ship.
2. Clinic admin shell + clinic/* → ship.
3. Remaining doctor files + admin/* → ship.
4. Translation sweep for the 10 non-English locales → ship.

Each phase is independently mergeable; preview stays functional with English fallbacks the whole way.

## Technical notes

- All new keys land under the existing namespaces — no i18next config changes.
- `defaultValue` is included on every `t()` so missing keys never produce blank UI during the rollout.
- No business-logic changes; presentation only.
- No new dependencies.
