// File: src/hooks/useStaffContext.ts

import { useMemo } from "react";
import { useAccessScope, type AccessScope } from "@/hooks/useAccessScope";

export type StaffType = "clinic" | "pharmacy" | "lab" | "imaging" | "unknown";

export interface EntityInfo {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
}

export type StaffPermissions =
  | ({ staffType: "clinic" } & {
      entity_id: string | null;
      staff_role: string | null;
      status: string;
      can_book_appointments: boolean;
      can_view_medical_records: boolean;
      can_manage_billing: boolean;
      can_manage_patients: boolean;
      can_view_schedule: boolean;
    })
  | ({ staffType: "lab" } & {
      entity_id: string | null;
      staff_role: string | null;
      status: string;
      can_process_samples: boolean;
      can_upload_results: boolean;
      can_verify_results: boolean;
      can_manage_equipment: boolean;
    })
  | ({ staffType: "imaging" } & {
      entity_id: string | null;
      staff_role: string | null;
      status: string;
      can_view_orders: boolean;
      can_process_scans: boolean;
      can_upload_results: boolean;
      can_verify_results: boolean;
      can_manage_equipment: boolean;
    })
  | ({ staffType: "pharmacy" } & {
      entity_id: string | null;
      staff_role: string | null;
      status: string;
      can_dispense: boolean;
      can_manage_inventory: boolean;
      can_process_prescriptions: boolean;
    });

function staffTypeFromScope(scope: AccessScope | null): StaffType {
  if (!scope) return "unknown";
  if (scope.entity_type === "clinic") return "clinic";
  if (scope.entity_type === "lab") return "lab";
  if (scope.entity_type === "imaging") return "imaging";
  if (scope.entity_type === "pharmacy") return "pharmacy";
  return "unknown";
}

export const useStaffContext = () => {
  const { loading, scope, error, refetch } = useAccessScope();

  const staffType = useMemo(() => staffTypeFromScope(scope), [scope]);

  const permissions: StaffPermissions | null = useMemo(() => {
    if (!scope || !scope.entity_id || staffType === "unknown") return null;

    const base = {
      entity_id: scope.entity_id,
      staff_role: scope.staff_role,
      status: scope.status,
    };

    const p = scope.permissions || {};

    if (staffType === "clinic") {
      return {
        staffType: "clinic",
        ...base,
        can_book_appointments: Boolean(p.can_book_appointments),
        can_view_medical_records: Boolean(p.can_view_medical_records),
        can_manage_billing: Boolean(p.can_manage_billing),
        can_manage_patients: Boolean(p.can_manage_patients),
        can_view_schedule: Boolean(p.can_view_schedule),
      };
    }

    if (staffType === "lab") {
      return {
        staffType: "lab",
        ...base,
        can_process_samples: Boolean(p.can_process_samples),
        can_upload_results: Boolean(p.can_upload_results),
        can_verify_results: Boolean(p.can_verify_results),
        can_manage_equipment: Boolean(p.can_manage_equipment),
      };
    }

    if (staffType === "imaging") {
      return {
        staffType: "imaging",
        ...base,
        can_view_orders: Boolean(p.can_view_orders),
        can_process_scans: Boolean(p.can_process_scans),
        can_upload_results: Boolean(p.can_upload_results),
        can_verify_results: Boolean(p.can_verify_results),
        can_manage_equipment: Boolean(p.can_manage_equipment),
      };
    }

    if (staffType === "pharmacy") {
      return {
        staffType: "pharmacy",
        ...base,
        can_dispense: Boolean(p.can_dispense),
        can_manage_inventory: Boolean(p.can_manage_inventory),
        can_process_prescriptions: Boolean(p.can_process_prescriptions),
      };
    }

    return null;
  }, [scope, staffType]);

  // Phase 1: entityInfo is optional and will be filled in Phase 2+ (admin-managed profiles + scoped read).
  const entityInfo: EntityInfo | null = useMemo(() => {
    if (!scope?.entity_id) return null;
    return { id: scope.entity_id, name: "" };
  }, [scope]);

  return {
    staffType,
    entityInfo,
    permissions,
    loading,
    error,
    isAdmin: Boolean(scope?.staff_role?.includes("admin")),
    refetch,
  };
};
