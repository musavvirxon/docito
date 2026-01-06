import { useMemo, useCallback, useEffect, useState } from "react";
import { useStaffContext } from "@/hooks/useStaffContext";
import { useTestOrders } from "@/hooks/useTestOrders";

type Stat = { title: string; value: string; change?: string; trend?: "up" | "down" | "neutral" };

export function useLabStaffDashboard() {
  const { entityInfo, loading: staffLoading } = useStaffContext();
  const labId = entityInfo?.id || "";

  const { testOrders, loading: ordersLoading, fetchLabOrders } = useTestOrders();

  // Fetch orders when labId changes
  useEffect(() => {
    if (labId) {
      fetchLabOrders(labId);
    }
  }, [labId, fetchLabOrders]);

  const stats = useMemo<Stat[]>(() => {
    const list = testOrders || [];
    const norm = (s?: string) => (s || "").toLowerCase();

    const pending = list.filter(o => ["pending", "new"].includes(norm((o as any).status))).length;
    const inProgress = list.filter(o => ["in_progress", "processing", "under_review"].includes(norm((o as any).status))).length;
    const completed = list.filter(o => ["completed", "done", "result_ready"].includes(norm((o as any).status))).length;

    return [
      { title: "Total Orders", value: String(list.length), trend: "neutral" },
      { title: "Pending", value: String(pending), trend: "neutral" },
      { title: "In Progress", value: String(inProgress), trend: "neutral" },
      { title: "Completed", value: String(completed), trend: "neutral" },
    ];
  }, [testOrders]);

  const activity = useMemo(() => {
    const list = [...(testOrders || [])];
    list.sort((a: any, b: any) => {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return db - da;
    });

    return list.slice(0, 6).map((o: any) => ({
      id: o.id,
      action: `Order ${o.status || "updated"}`,
      patient: o.patient?.full_name || "Patient",
      time: o.created_at ? new Date(o.created_at).toLocaleString() : "",
    }));
  }, [testOrders]);

  const recentOrders = useMemo(() => {
    const list = [...(testOrders || [])];
    list.sort((a: any, b: any) => {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return db - da;
    });
    return list.slice(0, 8);
  }, [testOrders]);

  const refresh = useCallback(() => {
    if (labId) {
      fetchLabOrders(labId);
    }
  }, [labId, fetchLabOrders]);

  return {
    labId,
    loading: staffLoading || ordersLoading,
    stats,
    activity,
    recentOrders,
    refresh,
  };
}
