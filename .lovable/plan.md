

# Pages & Translation Namespace Mapping + Fixes

## Current State

### Pages WITH translations connected (47 files)

| Page | Namespace(s) Used |
|------|------------------|
| `Index.tsx` (Home) | `home`, `common`, `homeSearch` |
| `Auth.tsx` | `auth` |
| `About.tsx` / `AboutLocalized.tsx` | `about`, `common` |
| `Contact.tsx` / `ContactLocalized.tsx` | `contact`, `common` |
| `Features.tsx` / `FeaturesLocalized.tsx` | `features`, `common` |
| `FAQs.tsx` / `FAQsLocalized.tsx` | `faqs`, `common` |
| `HelpCenter.tsx` / `HelpCenterLocalized.tsx` | `help`, `common` |
| `Support.tsx` / `SupportLocalized.tsx` | `support`, `common` |
| `Legal.tsx` / `LegalLocalized.tsx` | `legal`, `common` |
| `LegalDetail.tsx` | `legal` |
| `CookiePolicy.tsx` | `legal` |
| `TermsOfService.tsx` | `common`, `legal` |
| `legal/PrivacyPolicy.tsx` | `legal` |
| `legal/RefundPolicy.tsx` | `legal` |
| `HowItWorks.tsx` | `howItWorks`, `common` |
| `Pricing.tsx` | `pricing` |
| `PremiumHome.tsx` | `premium`, `premiumHero` |
| `Doctors.tsx` / `DoctorsLocalized.tsx` | `doctors`, `common` |
| `SearchDoctors.tsx` / `SearchDoctorsLocalized.tsx` | `doctors`, `common` |
| `BrowseSpecialties.tsx` / `BrowseSpecialtiesLocalized.tsx` | `specialties`, `doctors` |
| `Practices.tsx` / `PracticesLocalized.tsx` | `practices`, `common` |
| `FindPractices.tsx` | `practicePage`, `common` |
| `DoctorProfile.tsx` | `doctors` |
| `DoctorSignUp.tsx` | `auth` |
| `ProfilePage.tsx` | `profileMenu` |
| `PatientDashboard.tsx` | `dashboard` |
| `DoctorDashboard.tsx` | `dashboard` |
| `SuperAdminDashboard.tsx` | `dashboard` |
| `AppointmentSession.tsx` | `dashboard` |
| `NotFound.tsx` | `common` |
| `doctor/DoctorLandingPage.tsx` | `doctorPage`, `common` |
| `imaging/ImagingLandingPage.tsx` | `imagingPage`, `common` |
| `lab/LabLandingPage.tsx` | `lab`, `common` |
| `lab/LabDashboardPage.tsx` | `labAdminDashboard` |
| `pharmacy/PharmacyLandingPage.tsx` | `pharmacyPage`, `common` |
| `pharmacy/PharmacyDashboardPage.tsx` | `pharmacyAdminDashboard` |

### Pages WITHOUT translations (need connecting) — 32 files

| Page | Should Use Namespace |
|------|---------------------|
| `AppointmentBooking.tsx` | `common` (patient-facing, has hardcoded strings) |
| `BookingConfirmation.tsx` | `common` (patient-facing, has hardcoded strings) |
| `Messages.tsx` | `common` (minimal UI, low priority) |
| `VideoCall.tsx` | `common` (has hardcoded strings) |
| `LandingPage.tsx` | `common` (role selector page) |
| `FeedbackCenter.tsx` | `common` |
| `BillingPage.tsx` | `dashboard` |
| `FinanceDashboard.tsx` | `dashboard` |
| `TreatmentPlanning.tsx` | `dashboard` |
| `DoctorScheduleSettings.tsx` | `dashboard` |
| `PracticeSettings.tsx` | `dashboard` |
| `PracticeVerification.tsx` | `verification` |
| `RegisterPractice.tsx` | `common` |
| `ProcessingPractice.tsx` | `common` |
| `AcceptInvite.tsx` | `common` |
| `VerifyDocument.tsx` | `common` |
| `VerifyPatient.tsx` | `common` |
| `ProcedureLibrary.tsx` | `common` |
| `AdminDashboard.tsx` (Practice) | `dashboard` |
| `AdminDashboardPage.tsx` | `dashboard` |
| `AdminProfileSettings.tsx` | `dashboard` |
| `AdminSettingsPage.tsx` | `dashboard` |
| `StaffDashboard.tsx` / `StaffDashboardPage.tsx` | `dashboard` |
| `SuperAdminFeedbackInbox.tsx` | `dashboard` |
| `TranslationManagement.tsx` | `admin` |
| `admin/*.tsx` (3 files) | `admin` |
| `doctor/DoctorPatientProfile.tsx` | `dashboard` |
| `doctor/DoctorPublicProfile.tsx` | `doctorPage` |
| `doctor/DoctorVerification.tsx` | `verification` |
| `imaging/ImagingDashboard*.tsx`, `ImagingSettings.tsx`, etc. | `imagingAdminDashboard` |
| `lab/LabDashboard.tsx`, `LabSettings.tsx`, etc. | `labAdminDashboard` |
| `pharmacy/PharmacyDashboard.tsx`, `PharmacySettings.tsx`, etc. | `pharmacyAdminDashboard` |
| `blog/*.tsx` (4 files) | `common` (blog content is CMS-driven) |
| `dashboard/Feedback.tsx` | `dashboard` |
| `verification/VerificationPage.tsx` | `verification` |

### Locale files (35 in `public/locales/en/`)

All translation files exist in `en/` and most other languages. The files are: `about`, `admin`, `auth`, `common`, `contact`, `dashboard`, `doctorPage`, `doctors`, `faqs`, `features`, `help`, `home`, `homeSearch`, `howItWorks`, `imaging`, `imagingAdminDashboard`, `imagingPage`, `lab`, `labAdminDashboard`, `legal`, `patients`, `pharmacy`, `pharmacyAdminDashboard`, `pharmacyPage`, `popups`, `practicePage`, `practices`, `premium`, `premiumHero`, `pricing`, `pricing_matrix`, `profileMenu`, `specialties`, `support`, `verification`.

### Namespaces missing from `I18N_NAMESPACES` config

The `I18N_NAMESPACES` array in `src/i18n/config.ts` only lists 16 namespaces. These 19 are used by pages but not registered for preloading:

`contact`, `doctors`, `faqs`, `help`, `support`, `practices`, `specialties`, `doctorPage`, `pharmacyPage`, `imagingPage`, `lab`, `practicePage`, `homeSearch`, `patients`, `popups`, `verification`, `admin`, `imaging`, `pharmacy`, `pricing_matrix`

---

## Implementation Plan

### Step 1: Register all missing namespaces in i18n config

Update `src/i18n/config.ts` — add all 19 missing namespaces to `I18N_NAMESPACES` so they are properly preloaded.

### Step 2: Add `useTranslation` to unconnected pages

For each of the 32 pages without `useTranslation`, add the import and hook call with the appropriate namespace. This does NOT require converting all hardcoded strings to `t()` calls immediately — it establishes the connection so translations can be incrementally added.

**Priority pages** (patient-facing, most visible):
- `AppointmentBooking.tsx` → `useTranslation(['common', 'dashboard'])`
- `BookingConfirmation.tsx` → `useTranslation('common')`
- `VideoCall.tsx` → `useTranslation('common')`
- `LandingPage.tsx` → `useTranslation('common')`

**Dashboard pages** (doctor/admin-facing):
- `AdminDashboard.tsx`, `AdminDashboardPage.tsx`, `StaffDashboard.tsx`, `FinanceDashboard.tsx`, `BillingPage.tsx`, `TreatmentPlanning.tsx`, `DoctorScheduleSettings.tsx` → `useTranslation('dashboard')`

**Facility pages**:
- `imaging/*.tsx` → `useTranslation('imagingAdminDashboard')`
- `lab/*.tsx` → `useTranslation('labAdminDashboard')`
- `pharmacy/*.tsx` → `useTranslation('pharmacyAdminDashboard')`

**Remaining pages**: Connect with `common` or their closest matching namespace.

### Step 3: Verify `popups.json` is used

Check if `popups` namespace is referenced anywhere in components. If not, connect it to popup/dialog components that use hardcoded strings.

This plan touches ~35 files total: 1 config file + ~32 page files + potentially 2-3 shared component files.

