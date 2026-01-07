// src/lib/rbac.ts
import { supabase } from "@/integrations/supabase/client";

/**
 * Role-Based Access Control (RBAC)
 * Single source of truth for roles, routes, and priority.
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

export const PATIENT_DASHBOARD_ROUTE = "/patient-dashboard";
export const roleLabels: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  clinic_admin: "Clinic Admin",
  doctor: "Doctor",
  pharmacy_admin: "Pharmacy Admin",
  lab_admin: "Lab Admin",
  imaging_admin: "Imaging Admin",
  pharmacy_staff: "Pharmacy Staff",
  pharmacist: "Pharmacist",
  lab_staff: "Lab Staff",
  lab_technician: "Lab Technician",
  imaging_staff: "Imaging Staff",
  internal_imaging_tech: "Imaging Tech",
  clinic_staff: "Clinic Staff",
  staff: "Staff",
  receptionist: "Receptionist",
  nurse: "Nurse",
  patient: "Patient",
};

export function getUserRolesFromProfile(
  profile: { role?: string; roles?: string[] } | null | undefined
): AppRole[] {
  if (!profile) return ["patient"];

  const rawRoles: string[] =
    Array.isArray(profile.roles) && profile.roles.length > 0
      ? profile.roles
      : profile.role
        ? [profile.role]
        : [];

  const cleaned = rawRoles.map((r) => String(r).trim()).filter(Boolean);

  const known = new Set<AppRole>(Object.keys(DASHBOARD_ROUTES) as AppRole[]);
  const result = cleaned.filter((r) => known.has(r as AppRole)) as AppRole[];

  return result.length > 0 ? result : ["patient"];
}

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

export function getPrimaryRole(roles: string[]): AppRole {
  if (!roles?.length) return "patient";

  let best: AppRole = "patient";
  let bestScore = ROLE_PRIORITY[best];

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

export function getDashboardRoute(roles: string[]): string {
  const primary = getPrimaryRole(roles);
  return DASHBOARD_ROUTES[primary] ?? PATIENT_DASHBOARD_ROUTE;
}

export function canAccessPatientPortal(userRoles: string[]): boolean {
  return (userRoles || []).includes("patient");
}

/**
 * Fetch roles from Supabase user_roles table
 * Use anywhere you need roles outside AuthContext.
 */
export async function getUserRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    console.error("getUserRoles error:", error);
    return [];
  }

  return (data || []).map((r: any) => r.role as AppRole);
}

/** helper utilities */
export function hasRole(userRoles: string[], role: AppRole): boolean {
  return (userRoles || []).includes(role);
}

export function hasAnyRole(userRoles: string[], roles: AppRole[]): boolean {
  return (userRoles || []).some((r) => roles.includes(r as AppRole));
}
