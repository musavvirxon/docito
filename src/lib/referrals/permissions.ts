import { hasAnyRole, type AppRole } from "@/lib/rbac";

/**
 * UI permission guard for creating referrals.
 *
 * Product rule:
 * - All can create referrals EXCEPT patients and staff members.
 *
 * This is a UX-level check only. Database RLS remains the source of truth.
 */
const CREATOR_ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "clinic_admin",
  "doctor",
  "pharmacy_admin",
  "lab_admin",
  "imaging_admin",
];

export function canCreateReferrals(userRoles: string[] | null | undefined): boolean {
  return hasAnyRole(userRoles ?? [], CREATOR_ROLES);
}
