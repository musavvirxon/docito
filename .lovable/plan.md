## Plan

### 1. Fix `clinic_staff` check constraints (invite crash)
Migration to drop and re-create `clinic_staff_status_check` and `clinic_staff_staff_role_check` with the full set of statuses (`active, inactive, on_leave, terminated, invited, pending, cancelled, removed`) and roles (`receptionist, nurse, billing_manager, assistant, technician, hygienist, manager, other, clinic_staff, clinic_admin, viewer`).

No code changes needed in `AcceptInvite.tsx` or `ClinicStaffManager.tsx` — current insert values become valid.

### 2. New `clinic_services` table
Migration creates `public.clinic_services` with: `practice_id`, `name`, `description`, `duration_minutes`, `price_cents`, `currency`, `deposit_required`, `deposit_cents`, `deposit_type` (fixed|percent), `is_active`, `category`, timestamps.

Includes required GRANTs (authenticated + service_role), RLS enabled, and policies:
- SELECT via `can_access_practice(practice_id)`
- INSERT/UPDATE: practice admin, active clinic_admin/manager staff, or super_admin
- DELETE: practice admin or super_admin
- Service role bypass

### 3. Clinic Services & Pricing UI
- **New** `src/components/clinic/ClinicServicesManager.tsx`: card with table (name, category, duration, price, deposit, active toggle), Add/Edit dialog (name, category, description, duration, currency + price, deposit toggle → amount + fixed/percent, active toggle), edit + delete row actions. Direct supabase client calls scoped by `practice_id`.
- **Edit** `src/components/settings/ClinicAdminWorkspaceSettings.tsx`: add a "Services & Pricing" tab mounting `ClinicServicesManager` with `practice.id`.

### 4. Finance section fixes
- **Edit** `src/components/finance/FinanceHub.tsx`: guard at top — if `!entityId || !entityType`, render a muted "Finance data unavailable" message instead of invoking edge functions.
- **Audit** every render site of `<FinanceHub />` in the clinic admin dashboard (AdminDashboard, ClinicAdminWorkspaceSettings, any FinanceManagementSection) and ensure it passes `entityType="clinic"` and `entityId={practice.id}` (UUID from `practices`, not user id). Hide the finance tab when the viewer is not a practice admin / `clinic_admin` staff.

### Files

| File | Action |
|------|--------|
| `supabase/migrations/..._fix_clinic_staff_constraints.sql` | New |
| `supabase/migrations/..._clinic_services_table.sql` | New |
| `src/components/clinic/ClinicServicesManager.tsx` | New |
| `src/components/settings/ClinicAdminWorkspaceSettings.tsx` | Add tab |
| `src/components/finance/FinanceHub.tsx` | Add entity guard |
| FinanceHub render sites in clinic admin | Pass `entityType="clinic"` + `practice.id`, gate by role |

### Validation
- Invite a staff member → no constraint violation, row inserts with `status='invited'`, `staff_role='clinic_staff'`.
- Create/edit/delete a clinic service as practice admin and as clinic_admin staff; non-staff cannot see services from other practices.
- Finance tab loads analytics for the current practice; with no linked practice it shows the fallback message instead of crashing.
