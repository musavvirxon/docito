// File: src/hooks/usePharmacyStaffDashboard.ts
// FULL FILE REPLACEMENT

import { useMemo, useCallback, useEffect, useState } from "react";
import { useStaffContext } from "@/hooks/useStaffContext";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { usePharmacyInventory } from "@/hooks/usePharmacyInventory";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Stat = { title: string; value: string; change?: string; trend?: "up" | "down" | "neutral" };

type ActivityItem = {
  id: string;
  action: string;
  patient: string;
  time: string;
};

type EnrichedOrder = {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
  status?: string | null;
  priority?: string | null;
  total_amount?: number | string | null;
  payment_status?: string | null;
  pickup_method?: string | null;
  estimated_ready_at?: string | null;
  ready_at?: string | null;
  picked_up_at?: string | null;
  medication_name?: string | null;
  patient_name?: string | null;
  doctor_name?: string | null;
};

type QueueMeta = {
  pending: number;
  processing: number;
  ready: number;
  outForDelivery: number;
  completed: number;
  unpaid: number;
};

type InventoryMeta = {
  lowStockCount: number;
  expiringCount: number;
  outOfStockCount: number;
  totalSkus: number;
  stockValue: number;
};

function normalize(s?: string | null) {
  return (s || "").toLowerCase().trim();
}

function titleCase(value?: string | null) {
  return (value || "updated")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function pickMedicationName(order: any): string {
  const rx = order?.prescription;
  const firstItem = rx?.items?.[0] || rx?.prescription_items?.[0];
  return (
    firstItem?.medication_name ||
    rx?.prescription_items?.[0]?.medication_name ||
    rx?.items?.[0]?.medication_name ||
    "Prescription"
  );
}

export function usePharmacyStaffDashboard(pharmacyIdOverride?: string) {
  const { entityInfo, loading: staffLoading } = useStaffContext();
  const pharmacyId = pharmacyIdOverride || entityInfo?.id || "";

  const { fulfillmentOrders, loading: ordersLoading, fetchFulfillmentOrders } = usePrescriptions(
    pharmacyId ? { pharmacyId } : undefined,
  );

  const {
    inventory,
    lowStockItems,
    expiringItems,
    loading: invLoading,
    fetchInventory,
  } = usePharmacyInventory(pharmacyId || undefined);

  const [referralCount, setReferralCount] = useState(0);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [nameMap, setNameMap] = useState<Map<string, string>>(new Map());
  const [namesLoading, setNamesLoading] = useState(false);

  const fetchReferralCount = useCallback(async () => {
    if (!pharmacyId) {
      setReferralCount(0);
      return;
    }

    try {
      setReferralsLoading(true);
      const { count, error } = await supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("receiver_type", "pharmacy")
        .eq("receiver_entity_id", pharmacyId);

      if (error) throw error;
      setReferralCount(count ?? 0);
    } catch (e: any) {
      console.error(e);
      setReferralCount(0);
    } finally {
      setReferralsLoading(false);
    }
  }, [pharmacyId]);

  const fetchNames = useCallback(async () => {
    try {
      const orders = (fulfillmentOrders || []) as any[];
      const ids = new Set<string>();

      for (const o of orders) {
        if (o?.patient_id) ids.add(String(o.patient_id));
        if (o?.prescription?.patient_id) ids.add(String(o.prescription.patient_id));
        if (o?.prescription?.doctor_id) ids.add(String(o.prescription.doctor_id));
      }

      const userIds = Array.from(ids).filter(Boolean);
      if (userIds.length === 0) {
        setNameMap(new Map());
        return;
      }

      setNamesLoading(true);

      const next = new Map<string, string>();

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id,id,full_name,first_name,last_name")
          .in("user_id", userIds as any);

        if (error) throw error;

        for (const p of ((data || []) as any[])) {
          const key = String(p.user_id || p.id || "");
          if (!key) continue;
          const name =
            p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "User";
          next.set(key, String(name));
        }
      } catch {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id,id,full_name,first_name,last_name")
          .in("id", userIds as any);

        if (error) throw error;

        for (const p of ((data || []) as any[])) {
          const key = String(p.user_id || p.id || "");
          if (!key) continue;
          const name =
            p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "User";
          next.set(key, String(name));
        }
      }

      setNameMap(next);
    } catch (e) {
      console.warn("Unable to load profile names for pharmacy dashboard:", e);
      setNameMap(new Map());
    } finally {
      setNamesLoading(false);
    }
  }, [fulfillmentOrders]);

  useEffect(() => {
    void fetchReferralCount();
  }, [fetchReferralCount]);

  useEffect(() => {
    void fetchNames();
  }, [fetchNames]);

  const enrichedOrders = useMemo<EnrichedOrder[]>(() => {
    const list = ((fulfillmentOrders || []) as any[]).map((o) => {
      const rx = o?.prescription;
      const patientId = o?.patient_id || rx?.patient_id;
      const doctorId = rx?.doctor_id;

      const patientName =
        o?.patient?.full_name ||
        rx?.patient?.full_name ||
        (patientId ? nameMap.get(String(patientId)) : undefined) ||
        "Patient";

      const doctorName =
        o?.doctor?.full_name ||
        rx?.doctor?.full_name ||
        (doctorId ? nameMap.get(String(doctorId)) : undefined) ||
        "Doctor";

      return {
        id: o.id,
        created_at: o.created_at || null,
        updated_at: o.updated_at || null,
        status: o.status || null,
        priority: o.priority || null,
        total_amount: o.total_amount ?? null,
        payment_status: o.payment_status || null,
        pickup_method: o.pickup_method || null,
        estimated_ready_at: o.estimated_ready_at || null,
        ready_at: o.ready_at || null,
        picked_up_at: o.picked_up_at || null,
        medication_name: pickMedicationName(o),
        patient_name: patientName,
        doctor_name: doctorName,
      } satisfies EnrichedOrder;
    });

    list.sort((a, b) => {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return db - da;
    });

    return list;
  }, [fulfillmentOrders, nameMap]);

  const queueMeta = useMemo<QueueMeta>(() => {
    const list = enrichedOrders;

    const pending = list.filter((o) => ["pending", "new"].includes(normalize(o.status))).length;
    const processing = list.filter((o) =>
      ["processing", "preparing", "reviewing", "awaiting_payment"].includes(normalize(o.status)),
    ).length;
    const ready = list.filter((o) =>
      ["ready", "ready_for_pickup", "prepared"].includes(normalize(o.status)),
    ).length;
    const outForDelivery = list.filter((o) =>
      ["out_for_delivery", "delivering", "courier_assigned"].includes(normalize(o.status)),
    ).length;
    const completed = list.filter((o) =>
      ["completed", "delivered", "picked_up"].includes(normalize(o.status)),
    ).length;
    const unpaid = list.filter((o) =>
      ["unpaid", "pending", "requires_payment", "failed"].includes(normalize(o.payment_status)),
    ).length;

    return { pending, processing, ready, outForDelivery, completed, unpaid };
  }, [enrichedOrders]);

  const inventoryMeta = useMemo<InventoryMeta>(() => {
    const rows = (inventory || []) as any[];
    const outOfStockCount = rows.filter(
      (i) => (num(i.quantity_on_hand) - num(i.quantity_reserved)) <= 0,
    ).length;

    const stockValue = rows.reduce(
      (sum, i) => sum + Math.max(0, num(i.quantity_on_hand)) * Math.max(0, num(i.unit_cost)),
      0,
    );

    return {
      lowStockCount: lowStockItems?.length || 0,
      expiringCount: expiringItems?.length || 0,
      outOfStockCount,
      totalSkus: rows.length,
      stockValue,
    };
  }, [inventory, lowStockItems, expiringItems]);

  const stats = useMemo<Stat[]>(() => {
    const totalOrders = enrichedOrders.length;
    const totalRevenue = enrichedOrders.reduce((sum, o) => sum + num(o.total_amount), 0);

    return [
      { title: "Fulfillment Orders", value: String(totalOrders), trend: "neutral" },
      { title: "Processing / Ready", value: String(queueMeta.processing + queueMeta.ready), trend: "neutral" },
      { title: "Completed", value: String(queueMeta.completed), trend: "neutral" },
      { title: "Low Stock Items", value: String(inventoryMeta.lowStockCount), trend: "neutral" },
      { title: "Inventory Value (Cost)", value: `$${totalRevenue >= 0 ? inventoryMeta.stockValue.toFixed(2) : "0.00"}`.replace("$-","$"), trend: "neutral" },
      { title: "Incoming Referrals", value: String(referralCount), trend: "neutral" },
    ].slice(0, 4);
  }, [enrichedOrders, queueMeta, inventoryMeta, referralCount]);

  const activity = useMemo<ActivityItem[]>(() => {
    const events = enrichedOrders.slice(0, 12).map((o) => ({
      id: `order-${o.id}`,
      ts: new Date(o.updated_at || o.created_at || 0).getTime(),
      action: `Order ${titleCase(o.status)}`,
      patient: o.patient_name || "Patient",
      time: (o.updated_at || o.created_at) ? new Date(o.updated_at || o.created_at || "").toLocaleString() : "",
    }));

    return events
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 8)
      .map(({ id, action, patient, time }) => ({ id, action, patient, time }));
  }, [enrichedOrders]);

  const recentOrders = useMemo(() => enrichedOrders.slice(0, 12), [enrichedOrders]);

  const refresh = useCallback(() => {
    try {
      if (pharmacyId) {
        fetchFulfillmentOrders();
        fetchInventory();
        void fetchReferralCount();
        void fetchNames();
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to refresh pharmacy dashboard");
    }
  }, [pharmacyId, fetchFulfillmentOrders, fetchInventory, fetchReferralCount, fetchNames]);

  const loading = useMemo(() => {
    if (!pharmacyId) return staffLoading;
    return staffLoading || ordersLoading || invLoading || referralsLoading || namesLoading;
  }, [pharmacyId, staffLoading, ordersLoading, invLoading, referralsLoading, namesLoading]);

  return {
    pharmacyId,
    loading,
    stats,
    activity,
    recentOrders,
    inventoryMeta,
    queueMeta,
    refresh,
  };
}
