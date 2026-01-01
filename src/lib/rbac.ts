/**
 * Role-Based Access Control (RBAC)
 * Single source of truth for roles, routes, and priority.
 * 
 * IMPORTANT: Users sign up with ONE primary role.
 * Additional roles can only be added post-signup via proper onboarding.
 */

export type AppRole =
  | "super_admin"
  | "admin"
  | "clinic_admin"
  | "doctor"
  | "pharmacy_admin"
  | "lab_admin"
  | "imaging_admin"
  | "pharmacy_staff"
  | "pharmacist"
  | "lab_staff"
  | "lab_technician"
  | "imaging_staff"
  | "internal_imaging_tech"
  | "clinic_staff"
  | "staff"
  | "receptionist"
  | "nurse"
  | "patient";

// Dashboard routes for each role
export const DASHBOARD_ROUTES: Record<AppRole, string> = {
  super_admin: "/super-admin-dashboard",
  admin: "/clinic/dashboard",
  clinic_admin: "/clinic/dashboard",
  doctor: "/doctor-dashboard",

  pharmacy_admin: "/pharmacy/dashboard",
  lab_admin: "/lab/dashboard",
  imaging_admin: "/imaging/dashboard",

  pharmacy_staff: "/pharmacy/dashboard",
  pharmacist: "/pharmacy/dashboard",

  lab_staff: "/lab/dashboard",
  lab_technician: "/lab/dashboard",

  imaging_staff: "/imaging/dashboard",
  internal_imaging_tech: "/imaging/dashboard",

  clinic_staff: "/staff-dashboard",
  staff: "/staff-dashboard",
  receptionist: "/staff-dashboard",
  nurse: "/staff-dashboard",

  patient: "/patient-dashboard",
};

// Priority determines which role takes precedence for routing
// Higher number = higher priority
export const ROLE_PRIORITY: Record<AppRole, number> = {
  super_admin: 100,
  admin: 90,
  clinic_admin: 85,
  doctor: 80,

  pharmacy_admin: 70,
  lab_admin: 70,
  imaging_admin: 70,

  pharmacist: 60,
  lab_technician: 60,
  internal_imaging_tech: 60,

  pharmacy_staff: 55,
  lab_staff: 55,
  imaging_staff: 55,

  nurse: 50,
  receptionist: 45,
  clinic_staff: 40,
  staff: 35,

  patient: 10,
};

/**
 * Get the primary (highest priority) role from a list of roles.
 * Returns the role with highest priority, or "patient" as fallback.
 */
export function getPrimaryRole(roles: string[]): AppRole {
  if (!roles?.length) return "patient";
  
  let best: AppRole = "patient";
  let bestScore = ROLE_PRIORITY[best] ?? 0;

  for (const r of roles) {
    const role = r as AppRole;
    const score = ROLE_PRIORITY[role];
    if (score !== undefined && score > bestScore) {
      best = role;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Get dashboard route for the primary role in the given roles list.
 */
export function getDashboardRoute(roles: string[]): string {
  const primary = getPrimaryRole(roles);
  return DASHBOARD_ROUTES[primary] ?? "/patient-dashboard";
}

/**
 * Check if user can access patient portal.
 * Only users with patient role can access patient features.
 */
export function canAccessPatientPortal(userRoles: string[]): boolean {
  return userRoles.includes("patient");
}

/**
 * Check if user has a specific role.
 */
export function hasRole(userRoles: string[], role: AppRole): boolean {
  return userRoles.includes(role);
}

/**
 * Role groupings for access control
 */
export const FACILITY_ADMIN_ROLES: AppRole[] = [
  "pharmacy_admin",
  "lab_admin",
  "imaging_admin",
  "clinic_admin",
];

export const ADMIN_ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "clinic_admin",
];

export const STAFF_ROLES: AppRole[] = [
  "staff",
  "clinic_staff",
  "receptionist",
  "nurse",
  "pharmacy_staff",
  "pharmacist",
  "lab_staff",
  "lab_technician",
  "imaging_staff",
  "internal_imaging_tech",
];

/**
 * Check if a role is a facility admin role
 */
export function isFacilityAdmin(role: AppRole): boolean {
  return FACILITY_ADMIN_ROLES.includes(role);
}

/**
 * Check if a role is an admin role
 */
export function isAdmin(role: AppRole): boolean {
  return ADMIN_ROLES.includes(role);
}

/**
 * Check if a role is a staff role
 */
export function isStaff(role: AppRole): boolean {
  return STAFF_ROLES.includes(role);
}
