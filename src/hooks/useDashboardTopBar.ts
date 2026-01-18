// File: src/hooks/useDashboardTopBar.ts

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function entityTableForFacility(facilityType: FacilityType): string | null {
  switch (facilityType) {
    case "practice":
      return "practices";
    case "lab":
      return "lab_centers";
    case "imaging":
      return "imaging_centers";
    case "pharmacy":
      return "pharmacies";
    default:
      return null;
  }
}

export function useDashboardTopBar(role: AppRole) {
  const { session, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<DashboardTopBarContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<number | null>(null);

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

  // Realtime refresh: entity status/name + unread notifications
  useEffect(() => {
    if (!user?.id) return;

    const facilityType = (ctx?.facilityType ?? "none") as FacilityType;
    const entityId = ctx?.entityId ?? null;
    const entityTable = entityTableForFacility(facilityType);

    const scheduleRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        fetchContext();
      }, 400);
    };

    const channel = supabase.channel(`topbar-live-${user.id}-${facilityType}-${entityId ?? "none"}`);

    // Unread notifications changes
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      },
      () => scheduleRefresh(),
    );

    // Entity row changes (verification status etc.)
    if (entityTable && entityId) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: entityTable,
          filter: `id=eq.${entityId}`,
        },
        () => scheduleRefresh(),
      );
    }

    channel.subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [ctx?.entityId, ctx?.facilityType, fetchContext, user?.id]);

  const requestVerification = useCallback(
    async (comment?: string) => {
      const { data, error: fnError } = await supabase.functions.invoke("dashboard-topbar", {
        body: { action: "request_verification", role, comment },
      });

      if (fnError) throw fnError;

      await fetchContext();
      return data as any;
    },
    [fetchContext, role],
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
