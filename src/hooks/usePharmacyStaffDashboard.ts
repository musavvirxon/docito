import { useMemo, useCallback } from "react";
import { useStaffContext } from "@/hooks/useStaffContext";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { usePharmacyInventory } from "@/hooks/usePharmacyInventory";

type Stat = { title: string; value: string; change?: string; trend?: "up" | "down" | "neutral" };

export function usePharmacyStaffDashboard() {
  const { entityInfo, loading: staffLoading } = useStaffContext();
  const pharmacyId = entityInfo?.id || "";

  const { fulfillmentOrders, loading: ordersLoading, fetchFulfillmentOrders } = usePrescriptions(
    pharmacyId ? { pharmacyId } : undefined
  );
  const { lowStockItems, expiringItems, loading: invLoading } = usePharmacyInventory(pharmacyId || undefined);

  const stats = useMemo<Stat[]>(() => {
    const list = fulfillmentOrders || [];
    const norm = (s?: string) => (s || "").toLowerCase();

    const pending = list.filter(o => ["pending", "new"].includes(norm((o as any).status))).length;
    const ready = list.filter(o => ["ready", "ready_for_pickup"].includes(norm((o as any).status))).length;

    return [
      { title: "Total Prescriptions", value: String(list.length), trend: "neutral" },
      { title: "Pending", value: String(pending), trend: "neutral" },
      { title: "Ready", value: String(ready), trend: "neutral" },
      { title: "Low Stock Items", value: String(lowStockItems?.length || 0), trend: "neutral" },
    ];
  }, [fulfillmentOrders, lowStockItems]);

  const activity = useMemo(() => {
    const list = [...(fulfillmentOrders || [])];
    list.sort((a: any, b: any) => {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return db - da;
    });

    return list.slice(0, 6).map((o: any) => ({
      id: o.id,
      action: `Prescription ${o.status || "updated"}`,
      patient: o.patient?.full_name || "Patient",
      time: o.created_at ? new Date(o.created_at).toLocaleString() : "",
    }));
  }, [fulfillmentOrders]);

  const recentOrders = useMemo(() => {
    const list = [...(fulfillmentOrders || [])];
    list.sort((a: any, b: any) => {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return db - da;
    });
    return list.slice(0, 8);
  }, [fulfillmentOrders]);

  const refresh = useCallback(() => {
    if (pharmacyId) {
      fetchFulfillmentOrders();
    }
  }, [pharmacyId, fetchFulfillmentOrders]);

  return {
    pharmacyId,
    loading: staffLoading || ordersLoading || invLoading,
    stats,
    activity,
    recentOrders,
    inventoryMeta: {
      lowStockCount: lowStockItems?.length || 0,
      expiringCount: expiringItems?.length || 0,
    },
    refresh,
  };
}
