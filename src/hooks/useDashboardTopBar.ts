// File: src/hooks/useDashboardTopBar.ts

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/lib/rbac";

export type EntityStatus = "active" | "pending" | "verified" | "suspended";
export type FacilityType = "practice" | "lab" | "imaging" | "pharmacy" | "doctor" | "none";

type DashboardTopBarContext = {
  ok: boolean;
  role: AppRole;
  facilityType: FacilityType;
  entityId: string | null;
  entityName: string | null;
  entityStatus: EntityStatus;
  unreadCount: number;
};

export function useDashboardTopBar(role: AppRole) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<DashboardTopBarContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("dashboard-topbar", {
        body: { action: "get", role },
      });

      if (fnError) throw fnError;
      setCtx(data as DashboardTopBarContext);
    } catch (e: any) {
      setError(e?.message || "Failed to load topbar context");
      setCtx(null);
    } finally {
      setLoading(false);
    }
  }, [role, session?.access_token]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  const requestVerification = useCallback(
    async (comment?: string) => {
      const { data, error: fnError } = await supabase.functions.invoke("dashboard-topbar", {
        body: { action: "request_verification", role, comment },
      });

      if (fnError) throw fnError;

      // Refresh context after requesting
      await fetchContext();
      return data as any;
    },
    [fetchContext, role]
  );

  const resolved = useMemo(() => {
    return {
      loading,
      error,
      entityName: ctx?.entityName ?? undefined,
      entityStatus: (ctx?.entityStatus ?? "active") as EntityStatus,
      unreadCount: ctx?.unreadCount ?? 0,
      facilityType: (ctx?.facilityType ?? "none") as FacilityType,
      entityId: ctx?.entityId ?? null,
      refetch: fetchContext,
      requestVerification,
    };
  }, [ctx, error, fetchContext, loading, requestVerification]);

  return resolved;
}
