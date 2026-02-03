// src/lib/rbac.ts
export type AppRole =
  | "patient"
  | "doctor"
  | "staff"
  | "admin"
  | "clinic_admin"
  | "lab_admin"
  | "pharmacy_admin"
  | "imaging_admin"
  | "super_admin";

export const DASHBOARD_ROUTES: Record<AppRole, string> = {
  patient: "/patient/dashboard",
  doctor: "/doctor/dashboard",
  staff: "/staff/dashboard",
  admin: "/admin/dashboard",
  clinic_admin: "/admin/dashboard",
  lab_admin: "/lab/dashboard",
  pharmacy_admin: "/pharmacy/dashboard",
  imaging_admin: "/imaging/dashboard",
  super_admin: "/super-admin/dashboard",
};

const ROLE_PRIORITY: AppRole[] = [
  "super_admin",
  "lab_admin",
  "pharmacy_admin",
  "imaging_admin",
  "clinic_admin",
  "admin",
  "doctor",
  "staff",
  "patient",
];

export function normalizeRole(input?: string | null): AppRole | null {
  if (!input) return null;
  const v = String(input).trim().toLowerCase();

  // Common aliases / legacy names
  if (v === "practice_admin") return "clinic_admin";
  if (v === "clinicadmin") return "clinic_admin";
  if (v === "superadmin") return "super_admin";
  if (v === "labadmin") return "lab_admin";
  if (v === "pharmacyadmin") return "pharmacy_admin";
  if (v === "imagingadmin") return "imaging_admin";

  const allowed: Set<AppRole> = new Set([
    "patient",
    "doctor",
    "staff",
    "admin",
    "clinic_admin",
    "lab_admin",
    "pharmacy_admin",
    "imaging_admin",
    "super_admin",
  ]);

  return allowed.has(v as AppRole) ? (v as AppRole) : null;
}

export function getPrimaryRole(roles: AppRole[]): AppRole {
  if (!roles || roles.length === 0) return "patient";
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return r;
  }
  return "patient";
}

export function getDashboardRoute(roles: Array<AppRole | string> | undefined | null): string {
  const normalized = (roles ?? [])
    .map((r) => normalizeRole(String(r)))
    .filter(Boolean) as AppRole[];

  const primary = getPrimaryRole(normalized);
  return DASHBOARD_ROUTES[primary] || DASHBOARD_ROUTES.patient;
}

export function getUserRolesFromProfile(profile: any): AppRole[] {
  if (!profile) return [];

  const out: AppRole[] = [];

  // New style: profile.roles can be array or string
  const rolesField = profile.roles;
  if (Array.isArray(rolesField)) {
    for (const r of rolesField) {
      const n = normalizeRole(r);
      if (n) out.push(n);
    }
  } else if (typeof rolesField === "string" && rolesField.trim().length > 0) {
    // Support CSV or single role string
    const parts = rolesField.includes(",") ? rolesField.split(",") : [rolesField];
    for (const p of parts) {
      const n = normalizeRole(p);
      if (n) out.push(n);
    }
  }

  // Legacy: profile.role single string (patient/doctor/staff/admin)
  const legacy = normalizeRole(profile.role);
  if (legacy) out.push(legacy);

  // De-dup
  return Array.from(new Set(out));
}
