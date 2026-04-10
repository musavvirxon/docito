

# Connect All Dashboards to i18n Translations

## Scope

**~75 component files** across 6 dashboard areas have hardcoded English strings that need i18n connection. Total: ~26,000+ lines of component code plus ~6,000 lines in doctor components.

### Components Without i18n (by dashboard)

| Dashboard | Files | Total Lines |
|-----------|-------|-------------|
| **Staff** (clinic staff) | 15 files: StaffSidebar, StaffDashboardOverview, TodayScheduleSection, BillingSection, PatientListSection, AnalyticsSection, AttendanceAdminPanel, CompensationProfilesPanel, InvitationsList, StaffInviteDialog, TimeClockCard, ImagingDashboardContent, LabDashboardContent, PharmacyDashboardContent | ~4,000 |
| **Lab** | 13 files: LabAnalytics, LabBillingInsurance, LabHomeCollection, LabManualTestOrderDialog, LabOrderQueue, LabReferralsSection, LabSampleManager, LabSettingsSection, LabStaffManager, ResultEntry, TestCatalogManager, TestOrderCreator, TestParameterEditor | ~6,500 |
| **Pharmacy** | 11 files: FulfillmentQueue, PharmacyAnalytics, PharmacyDeliveryOrders, PharmacyInsuranceClaims, PharmacyInventoryManager, PharmacyManualPrescriptionDialog, PharmacyPatientView, PharmacyPrescriptionInbox, PharmacyReferralsSection, PharmacySettings, PharmacyStaffManager | ~7,700 |
| **Imaging** | 11 files: ImagingAnalytics, ImagingBillingSection, ImagingEquipmentManager, ImagingManualOrderDialog, ImagingOrdersManager, ImagingReferralsSection, ImagingReportManager, ImagingScanWorkflow, ImagingSettings, ImagingSettingsSection, ImagingStaffManager | ~7,100 |
| **Doctor** | 23 files: DoctorProfileSection, DoctorProceduresSection, DoctorReferralsSection, AssignedPatientsSection, InternalMessagingSection, PatientDetailView, DoctorVerificationStatusCard, various modals | ~6,200 |
| **Practice Admin** | AdminDashboard.tsx partial (billing/analytics sections still hardcoded) | ~400 lines |

### Translation files already exist
- `dashboard.json` (1442 lines) — covers admin, patient, doctor dashboard keys
- `imagingAdminDashboard.json` (644 lines) — covers imaging dashboard
- `labAdminDashboard.json` (349 lines) — covers lab dashboard
- `pharmacyAdminDashboard.json` (263 lines) — covers pharmacy dashboard

The JSON files have good key coverage but components don't reference them.

---

## Implementation Plan

### Step 1: Add `useTranslation` hook + replace strings in Staff components (15 files)
- Add `useTranslation('dashboard')` to all `src/components/staff/*.tsx`
- Replace hardcoded labels in StaffSidebar (role labels, menu items, staff type labels)
- Replace strings in StaffDashboardOverview, TodayScheduleSection, BillingSection, PatientListSection, TimeClockCard, etc.
- Add missing translation keys to `dashboard.json` under a new `staff` section

### Step 2: Add `useTranslation` hook + replace strings in Lab components (13 files)
- Add `useTranslation('labAdminDashboard')` to all `src/components/lab/*.tsx`
- Replace hardcoded strings with `t('dashboard.orders...')`, `t('dashboard.samples...')`, etc.
- Add any missing keys to `labAdminDashboard.json`

### Step 3: Add `useTranslation` hook + replace strings in Pharmacy components (11 files)
- Add `useTranslation('pharmacyAdminDashboard')` to all `src/components/pharmacy/*.tsx`
- Replace hardcoded strings with `t('pharmacyDashboard...')`
- Add any missing keys to `pharmacyAdminDashboard.json`

### Step 4: Add `useTranslation` hook + replace strings in Imaging components (11 files)
- Add `useTranslation('imagingAdminDashboard')` to all `src/components/imaging/*.tsx` (ImagingDashboard.tsx already has it)
- Replace hardcoded strings with `t('imagingDashboard...')`
- Add any missing keys to `imagingAdminDashboard.json`

### Step 5: Add `useTranslation` hook + replace strings in Doctor components (23 files)
- Add `useTranslation('dashboard')` to the 23 doctor components without it
- Replace hardcoded strings with `t('doctor...')`
- Add any missing keys to `dashboard.json` under the `doctor` section

### Step 6: Fix remaining hardcoded strings in AdminDashboard.tsx
- Replace ~12 remaining hardcoded strings in billing/analytics sections with existing `t('admin...')` keys
- Add any missing keys

### Step 7: Validate
- Run `tsc --noEmit` to verify no type errors
- Verify JSON files are valid

### Technical Details
- Each component gets `import { useTranslation } from "react-i18next"` and `const { t } = useTranslation("namespace")`
- Namespace mapping: staff/admin/doctor components use `dashboard`, facility components use their respective admin dashboard namespace
- Static label maps (like `STATUS_CONFIG`, `ROLE_LABELS`) will use `t()` calls inside the component body rather than at module level
- Translation JSON will be English-only (other languages can be added later via the translation management system)
- ~75 files modified, 4 JSON files updated

