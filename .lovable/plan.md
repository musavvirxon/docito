

# i18n Translation Coverage for All Dashboards

## Current State

After thorough inspection, here is the i18n status per dashboard:

**Already well-connected (have `useTranslation` + translation keys):**
- **Doctor Dashboard** (`DoctorDashboard.tsx`) - uses `dashboard` namespace, most strings wrapped in `t()`. Two hardcoded strings: "Verify Documents" sidebar labels (lines 163, 179).
- **Lab Dashboard** - all 13 components use `labAdminDashboard` namespace with extensive translations.
- **Pharmacy Dashboard** - all 11 components use `pharmacyAdminDashboard` namespace with extensive translations.
- **Imaging Dashboard** - all 12 components use `imagingAdminDashboard` namespace with extensive translations.
- **Staff Dashboard** (`StaffDashboardPage.tsx`) - uses `dashboard` namespace but has ~15 hardcoded strings (tab labels, error messages, loading text).
- **Admin Dashboard** (`AdminDashboard.tsx`) - uses `dashboard` namespace, overview/metrics use `t()`, but has ~30+ hardcoded strings in setup screens, error screens, locked overlays, and section content.

**Not connected at all (no `useTranslation`):**
- `SettingsPanel.tsx` (880 lines) - entire file hardcoded
- `DashboardTopNav.tsx` (132 lines) - all labels hardcoded
- `InviteProviderModal.tsx` (464 lines) - all labels hardcoded
- `InviteStaffModal.tsx` (182 lines) - all labels hardcoded
- `AddServiceModal.tsx` - hardcoded
- `AddLocationModal.tsx` - hardcoded
- `PracticeAnalyticsSection.tsx` (270 lines) - hardcoded
- `JoinRequestsSection.tsx` (152 lines) - hardcoded
- `PendingInvitationsSection.tsx` - hardcoded
- `StatsGrid.tsx` - hardcoded
- `EmptyState.tsx` - hardcoded

## Plan

### Step 1: Add missing translation keys to `dashboard.json`
Add new key sections for all hardcoded strings in:
- `DashboardTopNav` (verification, settings, status labels)
- `StaffDashboardPage` (tab labels, loading, error messages)
- `AdminDashboard` (locked overlay, setup screen, error retry)
- `SettingsPanel` (all tab names, field labels, section titles, ~100+ keys)
- `InviteProviderModal` (form labels, buttons, validation messages)
- `InviteStaffModal` (form labels, role names, buttons)
- `AddServiceModal` (form fields)
- `AddLocationModal` (form fields)
- `PracticeAnalyticsSection` (chart labels, time ranges, metrics)
- `JoinRequestsSection` (approval/reject labels, status)
- `PendingInvitationsSection` (status labels)
- `DoctorDashboard` ("Verify Documents" sidebar items)

### Step 2: Connect components to i18n
For each of the ~13 unconnected components:
- Import `useTranslation` from `react-i18next`
- Add `const { t } = useTranslation('dashboard')` 
- Replace every hardcoded English string with `t("keyPath")`

### Step 3: Fix remaining hardcoded strings in connected components
- `StaffDashboardPage.tsx`: Replace hardcoded tab labels (Dashboard, Today, Patients, Billing, Analytics, Settings, Attendance, Invites), error text, loading text
- `AdminDashboard.tsx`: Replace hardcoded strings in LockedOverlay, setup screen, error screen
- `DoctorDashboard.tsx`: Replace "Verify Documents" labels

### Step 4: Verify namespace registration
Confirm all namespaces are registered in `src/i18n/config.ts` for preloading.

## Scope

**Files to edit:** ~16 component files + 1 translation file
**Translation keys to add:** ~200+ new keys in `dashboard.json`
**Components to connect:** 13 previously unconnected + 3 partially connected

This is a large but mechanical task focused on wrapping strings in `t()` calls and adding corresponding English keys. No logic, layout, or data-access changes.

