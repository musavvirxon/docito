/**
 * Role-Based Access Control (RBAC) Configuration
 * Single source of truth for role permissions and dashboard routes
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

/**
 * Dashboard routes for each role
 */
export const DASHBOARD_ROUTES: Record<AppRole, string> = {
  super_admin: "/super-admin-dashboard",
  admin: "/admin-dashboard",
  clinic_admin: "/admin-dashboard",
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

export const PATIENT_DASHBOARD_ROUTE = "/patient-dashboard";

/**
 * Role priority for determining primary role
 * Higher number = higher priority
 */
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
 * Permission definitions for each role
 */
export const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  super_admin: ["*"],

  admin: [
    "clinic:read",
    "clinic:write",
    "clinic:delete",
    "staff:read",
    "staff:write",
    "staff:delete",
    "patients:read",
    "appointments:read",
    "appointments:write",
    "reports:read",
  ],

  clinic_admin: [
    "clinic:read",
    "clinic:write",
    "staff:read",
    "staff:write",
    "patients:read",
    "appointments:read",
    "appointments:write",
    "reports:read",
  ],

  doctor: [
    "appointments:read",
    "appointments:write",
    "appointments:delete",
    "patients:read",
    "patients:write",
    "prescriptions:read",
    "prescriptions:write",
    "procedures:read",
    "procedures:write",
    "referrals:read",
    "referrals:write",
    "lab_orders:write",
    "imaging_orders:write",
  ],

  pharmacy_admin: [
    "pharmacy:read",
    "pharmacy:write",
    "pharmacy:delete",
    "pharmacy_staff:read",
    "pharmacy_staff:write",
    "pharmacy_staff:delete",
    "prescriptions:read",
    "inventory:read",
    "inventory:write",
    "fulfillment:read",
    "fulfillment:write",
  ],

  lab_admin: [
    "lab:read",
    "lab:write",
    "lab:delete",
    "lab_staff:read",
    "lab_staff:write",
    "lab_staff:delete",
    "lab_orders:read",
    "lab_orders:write",
    "lab_results:read",
    "lab_results:write",
  ],

  imaging_admin: [
    "imaging:read",
    "imaging:write",
    "imaging:delete",
    "imaging_staff:read",
    "imaging_staff:write",
    "imaging_staff:delete",
    "imaging_orders:read",
    "imaging_orders:write",
    "imaging_results:read",
    "imaging_results:write",
  ],

  pharmacist: ["prescriptions:read", "inventory:read", "inventory:write", "fulfillment:read", "fulfillment:write"],

  pharmacy_staff: ["prescriptions:read", "inventory:read", "fulfillment:read", "fulfillment:write"],

  lab_technician: ["lab_orders:read", "lab_results:read", "lab_results:write"],

  lab_staff: ["lab_orders:read", "lab_results:read"],

  internal_imaging_tech: ["imaging_orders:read", "imaging_results:read", "imaging_results:write"],

  imaging_staff: ["imaging_orders:read", "imaging_results:read"],

  nurse: ["patients:read", "appointments:read", "vitals:read", "vitals:write"],

  receptionist: ["appointments:read", "appointments:write", "patients:read"],

  clinic_staff: ["appointments:read", "patients:read"],

  staff: ["appointments:read"],

  patient: ["own:appointments", "own:records", "own:prescriptions", "own:results"],
};

/**
 * Check if a user with given roles has a specific permission
 */
export function hasPermission(userRoles: string[], permission: string): boolean {
  for (const role of userRoles) {
    const permissions = ROLE_PERMISSIONS[role as AppRole];
    if (!permissions) continue;

    if (permissions.includes("*")) return true;
    if (permissions.includes(permission)) return true;

    const [resource] = permission.split(":");
    if (permissions.includes(`${resource}:*`)) return true;
  }

  return false;
}

/**
 * Get the primary (highest priority) role from a list of roles
 */
export function getPrimaryRole(roles: string[]): AppRole | null {
  if (!roles || roles.length === 0) return null;

  let highestPriority = -1;
  let primaryRole: AppRole | null = null;

  for (const role of roles) {
    const priority = ROLE_PRIORITY[role as AppRole];
    if (priority !== undefined && priority > highestPriority) {
      highestPriority = priority;
      primaryRole = role as AppRole;
    }
  }

  return primaryRole;
}

/**
 * Get the dashboard route for a user based on their roles
 */
export function getDashboardRoute(roles: string[]): string {
  const primaryRole = getPrimaryRole(roles);
  if (primaryRole && DASHBOARD_ROUTES[primaryRole]) return DASHBOARD_ROUTES[primaryRole];
  return PATIENT_DASHBOARD_ROUTE;
}

/**
 * Check if a user has any of the specified roles
 */
export function hasAnyRole(userRoles: string[], requiredRoles: AppRole[]): boolean {
  return requiredRoles.some((role) => userRoles.includes(role));
}

/**
 * Check if a user has all of the specified roles
 */
export function hasAllRoles(userRoles: string[], requiredRoles: AppRole[]): boolean {
  return requiredRoles.every((role) => userRoles.includes(role));
}

/**
 * Roles that can access facility dashboards
 */
export const FACILITY_ADMIN_ROLES: AppRole[] = ["pharmacy_admin", "lab_admin", "imaging_admin"];

/**
 * Roles that are considered staff
 */
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
 * Roles that are considered admin-level
 */
export const ADMIN_ROLES: AppRole[] = ["super_admin", "admin", "clinic_admin", "pharmacy_admin", "lab_admin", "imaging_admin"];

/**
 * Patient portal should be accessible to anyone who has the 'patient' role.
 * In Option B, every account automatically gets the 'patient' role.
 */
export function canAccessPatientPortal(userRoles: string[]): boolean {
  return userRoles.includes("patient");
}

/**
 * Convenience alias
 */
export function hasPatientAccess(userRoles: string[]): boolean {
  return canAccessPatientPortal(userRoles);
}

