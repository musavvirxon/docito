import { useMemo, useCallback, useEffect } from "react";
import { useStaffContext } from "@/hooks/useStaffContext";
import { useImagingOrders } from "@/hooks/useImagingOrders";

type Stat = { title: string; value: string; change?: string; trend?: "up" | "down" | "neutral" };

export function useImagingStaffDashboard() {
  const { entityInfo, loading: staffLoading } = useStaffContext();
  const imagingCenterId = entityInfo?.id || "";

  const { orders, loading: ordersLoading, fetchCenterOrders } = useImagingOrders();

  // Fetch orders when imagingCenterId changes
  useEffect(() => {
    if (imagingCenterId) {
      fetchCenterOrders(imagingCenterId);
    }
  }, [imagingCenterId, fetchCenterOrders]);

  const stats = useMemo<Stat[]>(() => {
    const list = orders || [];
    const norm = (s?: string) => (s || "").toLowerCase();

    const pending = list.filter(o => ["pending", "new"].includes(norm((o as any).status))).length;
    const scheduled = list.filter(o => ["scheduled", "booked"].includes(norm((o as any).status))).length;
    const completed = list.filter(o => ["completed", "done", "result_ready"].includes(norm((o as any).status))).length;

    return [
      { title: "Total Studies", value: String(list.length), trend: "neutral" },
      { title: "Pending", value: String(pending), trend: "neutral" },
      { title: "Scheduled", value: String(scheduled), trend: "neutral" },
      { title: "Completed", value: String(completed), trend: "neutral" },
    ];
  }, [orders]);

  const activity = useMemo(() => {
    const list = [...(orders || [])];
    list.sort((a: any, b: any) => {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return db - da;
    });

    return list.slice(0, 6).map((o: any) => ({
      id: o.id,
      action: `Imaging ${o.status || "updated"}`,
      patient: o.patient?.full_name || "Patient",
      time: o.created_at ? new Date(o.created_at).toLocaleString() : "",
    }));
  }, [orders]);

  const recentOrders = useMemo(() => {
    const list = [...(orders || [])];
    list.sort((a: any, b: any) => {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return db - da;
    });
    return list.slice(0, 8);
  }, [orders]);

  const refresh = useCallback(() => {
    if (imagingCenterId) {
      fetchCenterOrders(imagingCenterId);
    }
  }, [imagingCenterId, fetchCenterOrders]);

  return {
    imagingCenterId,
    loading: staffLoading || ordersLoading,
    stats,
    activity,
    recentOrders,
    refresh,
  };
}
