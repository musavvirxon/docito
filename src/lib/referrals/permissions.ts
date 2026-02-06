// File: src/lib/referrals/permissions.ts
import { normalizeRole } from "@/lib/rbac";

/**
 * UI permission guard for creating referrals.
 *
 * Product rule:
 * - Any authenticated role can create referrals EXCEPT patients.
 *
 * This is a UX-level check only. Database RLS remains the source of truth.
 */
export function canCreateReferrals(userRoles: string[] | null | undefined): boolean {
  if (!userRoles || !Array.isArray(userRoles) || userRoles.length === 0) return false;

  const roles = userRoles
    .map((r) => normalizeRole(r))
    .filter((r): r is NonNullable<ReturnType<typeof normalizeRole>> => Boolean(r));

  // Allow if the user has ANY role that is not "patient"
  return roles.some((r) => r !== "patient");
}
