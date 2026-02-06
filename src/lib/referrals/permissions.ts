// File: src/lib/referrals/permissions.ts
export function canCreateReferrals(allRoles: string[] | null | undefined): boolean {
  const roles = (allRoles || []).map((r) => String(r || "").toLowerCase()).filter(Boolean);
  if (roles.includes("super_admin")) return true;

  // Any role except patient may create (as requested).
  return roles.some((r) => r !== "patient");
}
