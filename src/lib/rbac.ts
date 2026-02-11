// src/lib/rbac.ts
export type AppRole =
  | "patient"
  | "doctor"
  | "admin"
  | "staff"
  | "super_admin"
  | "clinic_admin"
  | "pharmacy_admin"
  | "lab_admin"
  | "imaging_admin";

export const roleLabels: Record<AppRole, string> = {
  patient: "Patient",
  doctor: "Doctor",
  admin: "Admin",
  staff: "Staff",
  super_admin: "Super Admin",
  clinic_admin: "Clinic Admin",
  pharmacy_admin: "Pharmacy Admin",
  lab_admin: "Lab Admin",
  imaging_admin: "Imaging Admin",
};

/**
 * Dashboard route per "primary" role.
 * Facility admin roles MUST win over clinic_admin/admin so they land on their own dashboards.
 * NOTE: These routes must exist in src/App.tsx (they do in this project).
 */
export const DASHBOARD_ROUTES: Record<AppRole, string> = {
  patient: "/patient-dashboard",
  doctor: "/doctor/dashboard",
  admin: "/practices/dashboard",
  staff: "/staff-dashboard",
  super_admin: "/super-admin-dashboard",
  clinic_admin: "/practices/dashboard",
  pharmacy_admin: "/pharmacy/dashboard",
  lab_admin: "/lab/dashboard",
  imaging_admin: "/imaging/dashboard",
};

const VALID_ROLES: AppRole[] = [
  "patient",
  "doctor",
  "admin",
  "staff",
  "super_admin",
  "clinic_admin",
  "pharmacy_admin",
  "lab_admin",
  "imaging_admin",
];

export function normalizeRole(input: unknown): AppRole | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;

  const s = raw.toLowerCase();

  // Common aliases / legacy values
  if (s === "superadmin" || s === "super-admin") return "super_admin";
  if (s === "clinicadmin" || s === "clinic-admin" || s === "practice_admin") return "clinic_admin";
  if (s === "labadmin" || s === "lab-admin") return "lab_admin";
  if (s === "pharmacyadmin" || s === "pharmacy-admin") return "pharmacy_admin";
  if (s === "imagingadmin" || s === "imaging-admin") return "imaging_admin";

  if (VALID_ROLES.includes(s as AppRole)) return s as AppRole;
  return null;
}

export function getUserRolesFromProfile(profile: any): AppRole[] {
  const out: AppRole[] = [];

  // Legacy single role field
  const legacy = normalizeRole(profile?.role);
  if (legacy) out.push(legacy);

  // profiles.roles could be string[] or CSV-like string
  const rolesField = profile?.roles;

  if (Array.isArray(rolesField)) {
    for (const r of rolesField) {
      const nr = normalizeRole(r);
      if (nr) out.push(nr);
    }
  } else if (typeof rolesField === "string") {
    for (const r of rolesField.split(",").map((x: string) => x.trim())) {
      const nr = normalizeRole(r);
      if (nr) out.push(nr);
    }
  }

  // Dedup preserve order
  return Array.from(new Set(out));
}

export function getPrimaryRole(roles: AppRole[]): AppRole {
  // Priority order if multiple roles:
  // Facility admins MUST win over clinic_admin/admin.
  const order: AppRole[] = [
    "super_admin",
    "lab_admin",
    "pharmacy_admin",
    "imaging_admin",
    "clinic_admin",
    "admin",
    "staff",
    "doctor",
    "patient",
  ];

  for (const r of order) if (roles.includes(r)) return r;
  return roles[0] ?? "patient";
}

export function getDashboardRoute(rolesOrRole: AppRole[] | AppRole | string[] | string): string {
  const roles = Array.isArray(rolesOrRole)
    ? (rolesOrRole.map((r) => normalizeRole(r)).filter(Boolean) as AppRole[])
    : ([normalizeRole(rolesOrRole)].filter(Boolean) as AppRole[]);

  const primary = getPrimaryRole(roles);
  return DASHBOARD_ROUTES[primary] || "/dashboard";
}

export function hasAnyRole(userRoles: string[] | null | undefined, requiredRoles: AppRole[]): boolean {
  if (!userRoles || !Array.isArray(userRoles)) return false;
  return userRoles.some((role) => requiredRoles.includes(normalizeRole(role) as AppRole));
}

/**
 * Used to infer role from current route (for nav + role syncing).
 */
export function inferRoleFromPathname(pathname: string): AppRole | null {
  const p = (pathname || "").toLowerCase();

  // Super admin
  if (p.startsWith("/super-admin-dashboard") || p.startsWith("/super-admin/dashboard")) return "super_admin";

  // Clinic admin
  if (
    p.startsWith("/practices/dashboard") ||
    p.startsWith("/register-practice") ||
    p.startsWith("/practice-settings") ||
    p.startsWith("/practice-verification")
  ) {
    return "clinic_admin";
  }

  // Facility dashboards
  if (p.startsWith("/dashboard/labs") || p.startsWith("/lab/dashboard")) return "lab_admin";
  if (p.startsWith("/dashboard/pharmacies") || p.startsWith("/pharmacy/dashboard")) return "pharmacy_admin";
  if (p.startsWith("/dashboard/imaging") || p.startsWith("/imaging/dashboard")) return "imaging_admin";

  // Staff/Admin dashboards
  if (p.startsWith("/staff-dashboard") || p.startsWith("/staff/dashboard")) return "staff";
  if (p.startsWith("/admin-dashboard") || p.startsWith("/admin/dashboard")) return "admin";

  // Provider + patient dashboards
  if (p.startsWith("/doctor-dashboard") || p.startsWith("/doctor/dashboard")) return "doctor";
  if (p.startsWith("/patient-dashboard") || p.startsWith("/patient/dashboard")) return "patient";

  return null;
}
