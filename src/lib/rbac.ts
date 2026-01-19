// File: src/lib/rbac.ts
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

export const DASHBOARD_ROUTES: Record<AppRole, string> = {
  patient: "/patient-dashboard",
  doctor: "/doctor-dashboard",
  admin: "/admin-dashboard",
  staff: "/staff-dashboard",
  super_admin: "/admin-dashboard",
  clinic_admin: "/practices/dashboard",
  pharmacy_admin: "/dashboard/pharmacies",
  lab_admin: "/dashboard/labs",
  imaging_admin: "/dashboard/imaging",
};

const VALID_ROLES: AppRole[] = [
  "patient", "doctor", "admin", "staff", 
  "super_admin", "clinic_admin", "pharmacy_admin", "lab_admin", "imaging_admin"
];

export function normalizeRole(input: unknown): AppRole | null {
  const s = String(input || "").trim().toLowerCase();
  if (VALID_ROLES.includes(s as AppRole)) return s as AppRole;
  return null;
}

export function getUserRolesFromProfile(profile: any): AppRole[] {
  const out: AppRole[] = [];

  // Legacy single role field
  const legacy = normalizeRole(profile?.role);
  if (legacy) out.push(legacy);

  // profiles.roles could be string[] or CSV-like
  const rolesField = profile?.roles;
  if (Array.isArray(rolesField)) {
    for (const r of rolesField) {
      const nr = normalizeRole(r);
      if (nr) out.push(nr);
    }
  } else if (typeof rolesField === "string") {
    for (const r of rolesField.split(",").map((x) => x.trim())) {
      const nr = normalizeRole(r);
      if (nr) out.push(nr);
    }
  }

  // Dedup preserve order
  return Array.from(new Set(out));
}

export function getPrimaryRole(roles: AppRole[]): AppRole {
  // Priority order if multiple roles
  const order: AppRole[] = ["super_admin", "admin", "clinic_admin", "lab_admin", "pharmacy_admin", "imaging_admin", "staff", "doctor", "patient"];
  for (const r of order) if (roles.includes(r)) return r;
  return roles[0] ?? "patient";
}

export function getDashboardRoute(rolesOrRole: AppRole[] | AppRole | string[] | string): string {
  const roles = Array.isArray(rolesOrRole) ? rolesOrRole.map(r => normalizeRole(r)).filter(Boolean) as AppRole[] : [normalizeRole(rolesOrRole)].filter(Boolean) as AppRole[];
  const primary = getPrimaryRole(roles);
  return DASHBOARD_ROUTES[primary] || "/dashboard";
}

export function hasAnyRole(userRoles: string[] | null | undefined, requiredRoles: AppRole[]): boolean {
  if (!userRoles || !Array.isArray(userRoles)) return false;
  return userRoles.some(role => requiredRoles.includes(role as AppRole));
}

export function inferRoleFromPathname(pathname: string): AppRole | null {
  const p = (pathname || "").toLowerCase();

  if (p.startsWith("/admin")) return "admin";
  if (p.startsWith("/staff")) return "staff";
  if (p.startsWith("/doctor")) return "doctor";
  if (p.startsWith("/patient")) return "patient";

  if (p.startsWith("/admin-dashboard")) return "admin";
  if (p.startsWith("/staff-dashboard")) return "staff";
  if (p.startsWith("/doctor-dashboard")) return "doctor";
  if (p.startsWith("/patient-dashboard")) return "patient";

  return null;
}
