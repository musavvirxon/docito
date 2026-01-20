// File: src/lib/rbac.ts
export type AppRole =
  | "patient"
  | "doctor"
  | "staff"
  | "practice_staff"
  | "admin"
  | "super_admin"
  | "clinic_admin"
  | "clinic_staff"
  | "receptionist"
  | "nurse"
  | "lab_admin"
  | "lab_staff"
  | "lab_technician"
  | "imaging_admin"
  | "imaging_staff"
  | "internal_imaging_tech"
  | "pharmacy_admin"
  | "pharmacy_staff"
  | "pharmacist";

export const roleLabels: Partial<Record<AppRole, string>> = {
  patient: "Patient",
  doctor: "Doctor",
  staff: "Staff",
  practice_staff: "Practice Staff",
  admin: "Admin",
  super_admin: "Super Admin",
  clinic_admin: "Clinic Admin",
  clinic_staff: "Clinic Staff",
  receptionist: "Receptionist",
  nurse: "Nurse",
  lab_admin: "Lab Admin",
  lab_staff: "Lab Staff",
  lab_technician: "Lab Technician",
  imaging_admin: "Imaging Admin",
  imaging_staff: "Imaging Staff",
  internal_imaging_tech: "Imaging Tech",
  pharmacy_admin: "Pharmacy Admin",
  pharmacy_staff: "Pharmacy Staff",
  pharmacist: "Pharmacist",
};

export const DASHBOARD_ROUTES: Record<AppRole, string> = {
  patient: "/patient-dashboard",
  doctor: "/doctor-dashboard",

  // Global routes
  admin: "/admin-dashboard",
  super_admin: "/admin-dashboard",

  // Clinic
  clinic_admin: "/practices/dashboard",
  clinic_staff: "/staff-dashboard",
  receptionist: "/staff-dashboard",
  nurse: "/staff-dashboard",
  staff: "/staff-dashboard",
  practice_staff: "/staff-dashboard",

  // Lab
  lab_admin: "/dashboard/labs",
  lab_staff: "/dashboard/labs",
  lab_technician: "/dashboard/labs",

  // Imaging
  imaging_admin: "/dashboard/imaging",
  imaging_staff: "/dashboard/imaging",
  internal_imaging_tech: "/dashboard/imaging",

  // Pharmacy
  pharmacy_admin: "/dashboard/pharmacies",
  pharmacy_staff: "/dashboard/pharmacies",
  pharmacist: "/dashboard/pharmacies",
};

const VALID_ROLES: Set<AppRole> = new Set<AppRole>([
  "patient",
  "doctor",
  "staff",
  "practice_staff",
  "admin",
  "super_admin",
  "clinic_admin",
  "clinic_staff",
  "receptionist",
  "nurse",
  "lab_admin",
  "lab_staff",
  "lab_technician",
  "imaging_admin",
  "imaging_staff",
  "internal_imaging_tech",
  "pharmacy_admin",
  "pharmacy_staff",
  "pharmacist",
]);

export function normalizeRole(input: unknown): AppRole | null {
  const s = String(input || "").trim().toLowerCase();
  if (VALID_ROLES.has(s as AppRole)) return s as AppRole;
  return null;
}

export function getUserRolesFromProfile(profile: any): AppRole[] {
  const out: AppRole[] = [];

  const legacy = normalizeRole(profile?.role);
  if (legacy) out.push(legacy);

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

  return Array.from(new Set(out));
}

/**
 * IMPORTANT FIX:
 * Facility admins MUST win over clinic_admin when both exist.
 * This fixes imaging/lab/pharmacy admins being routed to clinic dashboard.
 */
export function getPrimaryRole(roles: AppRole[]): AppRole {
  const order: AppRole[] = [
    "super_admin",
    "admin",

    // Facility admins (prefer over clinic_admin)
    "lab_admin",
    "imaging_admin",
    "pharmacy_admin",
    "clinic_admin",

    // Facility staff
    "lab_staff",
    "lab_technician",
    "imaging_staff",
    "internal_imaging_tech",
    "pharmacy_staff",
    "pharmacist",
    "clinic_staff",
    "receptionist",
    "nurse",

    // Global
    "staff",
    "practice_staff",
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
  return DASHBOARD_ROUTES[primary] || "/";
}

export function hasAnyRole(userRoles: string[] | null | undefined, requiredRoles: AppRole[]): boolean {
  if (!userRoles || !Array.isArray(userRoles)) return false;
  return userRoles.some((role) => requiredRoles.includes(role as AppRole));
}

export function inferRoleFromPathname(pathname: string): AppRole | null {
  const p = (pathname || "").toLowerCase();

  if (p.startsWith("/admin-dashboard") || p.startsWith("/admin")) return "admin";
  if (p.startsWith("/staff-dashboard") || p.startsWith("/staff")) return "staff";
  if (p.startsWith("/doctor-dashboard") || p.startsWith("/doctor")) return "doctor";
  if (p.startsWith("/patient-dashboard") || p.startsWith("/patient")) return "patient";

  if (p.startsWith("/practices/dashboard") || p.startsWith("/practice-")) return "clinic_admin";
  if (p.startsWith("/dashboard/labs") || p.startsWith("/lab/")) return "lab_admin";
  if (p.startsWith("/dashboard/imaging") || p.startsWith("/imaging/")) return "imaging_admin";
  if (p.startsWith("/dashboard/pharmacies") || p.startsWith("/pharmacy/")) return "pharmacy_admin";

  return null;
}
