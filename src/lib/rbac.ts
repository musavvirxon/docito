// File: src/lib/rbac.ts
export type AppRole = "patient" | "doctor" | "admin" | "staff";

export const roleLabels: Record<AppRole, string> = {
  patient: "Patient",
  doctor: "Doctor",
  admin: "Admin",
  staff: "Staff",
};

export const DASHBOARD_ROUTES: Record<AppRole, string> = {
  patient: "/patient-dashboard",
  doctor: "/doctor-dashboard",
  admin: "/admin-dashboard",
  staff: "/staff-dashboard",
};

export function normalizeRole(input: unknown): AppRole | null {
  const s = String(input || "").trim().toLowerCase();
  if (s === "patient" || s === "doctor" || s === "admin" || s === "staff") return s;
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
  const order: AppRole[] = ["admin", "staff", "doctor", "patient"];
  for (const r of order) if (roles.includes(r)) return r;
  return roles[0] ?? "patient";
}

export function getDashboardRoute(rolesOrRole: AppRole[] | AppRole): string {
  const roles = Array.isArray(rolesOrRole) ? rolesOrRole : [rolesOrRole];
  const primary = getPrimaryRole(roles);
  return DASHBOARD_ROUTES[primary] || "/dashboard";
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
