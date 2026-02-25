// File: src/hooks/useLabStaffDashboard.ts
// FULL FILE REPLACEMENT

import { useCallback, useEffect, useMemo, useState } from "react";
import { subDays } from "date-fns";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useStaffContext } from "@/hooks/useStaffContext";

type TestOrderRow = Database["public"]["Tables"]["test_orders"]["Row"];
type TestOrderItemRow = Database["public"]["Tables"]["test_order_items"]["Row"];
type TestResultRow = Database["public"]["Tables"]["test_results"]["Row"];

type Stat = {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
};

type ActivityItem = {
  id: string;
  action: string;
  patient: string;
  time: string;
};

type RecentOrderRow = TestOrderRow & {
  item_count?: number;
  result_count?: number;
  has_abnormal_result?: boolean;
};

type DashboardPayload = {
  orders: RecentOrderRow[];
  items: TestOrderItemRow[];
  results: TestResultRow[];
};

function normalizeStatus(status?: string | null) {
  return (status || "").toLowerCase().trim();
}

function titleCaseStatus(status?: string | null) {
  return (status || "updated")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function patientLabel(order: Partial<TestOrderRow>) {
  return (
    order.patient_snapshot_full_name ||
    order.patient_name ||
    order.patient_email ||
    order.patient_phone ||
    "Patient"
  );
}

function chunk<T>(arr: T[], size = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function useLabStaffDashboard() {
  const { entityInfo, loading: staffLoading } = useStaffContext();
  const labId = entityInfo?.id || "";

  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<DashboardPayload>({
    orders: [],
    items: [],
    results: [],
  });

  const fetchDashboard = useCallback(async () => {
    if (!labId) {
      setPayload({ orders: [], items: [], results: [] });
      return;
    }

    try {
      setLoading(true);

      // Pull enough data for recent dashboard cards + queue signals.
      const sinceIso = subDays(new Date(), 120).toISOString();

      const { data: ordersData, error: ordersError } = await supabase
        .from("test_orders")
        .select(
          "id,appointment_id,clinical_notes,completed_at,created_at,diagnosis_codes,doctor_id,external_patient_ref,insurance_covered,lab_center_id,order_number,patient_email,patient_id,patient_name,patient_phone,patient_snapshot_address,patient_snapshot_dob,patient_snapshot_email,patient_snapshot_full_name,patient_snapshot_gender,patient_snapshot_id_number,patient_snapshot_phone,payment_status,priority,sample_collected_at,sample_collected_by,scheduled_date,scheduled_time,status,total_amount,updated_at",
        )
        .eq("lab_center_id", labId)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(500);

      if (ordersError) throw ordersError;

      const orders = ((ordersData || []) as TestOrderRow[]) || [];
      const orderIds = orders.map((o) => o.id);

      let items: TestOrderItemRow[] = [];
      let results: TestResultRow[] = [];

      if (orderIds.length > 0) {
        const itemResponses = await Promise.all(
          chunk(orderIds, 500).map((ids) =>
            supabase
              .from("test_order_items")
              .select("*")
              .in("test_order_id", ids),
          ),
        );

        for (const resp of itemResponses) {
          if (resp.error) throw resp.error;
          items.push(...(((resp.data || []) as TestOrderItemRow[]) || []));
        }

        const itemIds = items.map((i) => i.id);

        if (itemIds.length > 0) {
          const resultResponses = await Promise.all(
            chunk(itemIds, 500).map((ids) =>
              supabase
                .from("test_results")
                .select("*")
                .in("test_order_item_id", ids),
            ),
          );

          for (const resp of resultResponses) {
            if (resp.error) throw resp.error;
            results.push(...(((resp.data || []) as TestResultRow[]) || []));
          }
        }
      }

      // Enrich orders with item/result aggregates used by overview UI.
      const itemCountByOrder = new Map<string, number>();
      const itemIdsByOrder = new Map<string, string[]>();
      for (const item of items) {
        itemCountByOrder.set(item.test_order_id, (itemCountByOrder.get(item.test_order_id) || 0) + 1);
        const list = itemIdsByOrder.get(item.test_order_id) || [];
        list.push(item.id);
        itemIdsByOrder.set(item.test_order_id, list);
      }

      const resultCountByItem = new Map<string, number>();
      const abnormalByItem = new Map<string, boolean>();
      for (const r of results) {
        resultCountByItem.set(r.test_order_item_id, (resultCountByItem.get(r.test_order_item_id) || 0) + 1);
        if (r.is_abnormal) abnormalByItem.set(r.test_order_item_id, true);
      }

      const enrichedOrders: RecentOrderRow[] = orders.map((o) => {
        const itemIdsForOrder = itemIdsByOrder.get(o.id) || [];
        const resultCount = itemIdsForOrder.reduce((sum, itemId) => sum + (resultCountByItem.get(itemId) || 0), 0);
        const hasAbnormal = itemIdsForOrder.some((itemId) => abnormalByItem.get(itemId) === true);

        return {
          ...o,
          item_count: itemCountByOrder.get(o.id) || 0,
          result_count: resultCount,
          has_abnormal_result: hasAbnormal,
        };
      });

      setPayload({
        orders: enrichedOrders,
        items,
        results,
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load lab dashboard");
      setPayload({ orders: [], items: [], results: [] });
    } finally {
      setLoading(false);
    }
  }, [labId]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const stats = useMemo<Stat[]>(() => {
    const list = payload.orders || [];
    const norm = normalizeStatus;

    const pending = list.filter((o) =>
      ["pending", "new", "scheduled"].includes(norm(o.status)),
    ).length;

    const inProgress = list.filter((o) =>
      ["in_progress", "processing", "under_review", "sample_collected"].includes(norm(o.status)),
    ).length;

    const completed = list.filter((o) =>
      ["completed", "done", "result_ready"].includes(norm(o.status)),
    ).length;

    return [
      { title: "Total Orders", value: String(list.length), trend: "neutral" },
      { title: "Pending", value: String(pending), trend: "neutral" },
      { title: "In Progress", value: String(inProgress), trend: "neutral" },
      { title: "Completed", value: String(completed), trend: "neutral" },
    ];
  }, [payload.orders]);

  const activity = useMemo<ActivityItem[]>(() => {
    const orders = payload.orders || [];
    const results = payload.results || [];
    const items = payload.items || [];

    const itemToOrderId = new Map(items.map((i) => [i.id, i.test_order_id]));
    const orderMap = new Map(orders.map((o) => [o.id, o]));

    const orderEvents = orders.slice(0, 12).map((o) => ({
      id: `order-${o.id}`,
      ts: new Date(o.updated_at || o.created_at || 0).getTime(),
      action: `Order ${titleCaseStatus(o.status)}`,
      patient: patientLabel(o),
      time:
        o.updated_at || o.created_at
          ? new Date(o.updated_at || o.created_at).toLocaleString()
          : "",
    }));

    const resultEvents = results.slice(0, 20).map((r) => {
      const orderId = itemToOrderId.get(r.test_order_item_id);
      const order = orderId ? orderMap.get(orderId) : undefined;
      const when = r.verified_at || r.performed_at || r.updated_at || r.created_at;
      const abnormal = r.is_abnormal ? " (abnormal)" : "";
      return {
        id: `result-${r.id}`,
        ts: new Date(when || 0).getTime(),
        action: `Result ${titleCaseStatus(r.status || (r.verified_at ? "verified" : "updated"))}${abnormal}`,
        patient: patientLabel(order || {}),
        time: when ? new Date(when).toLocaleString() : "",
      };
    });

    return [...orderEvents, ...resultEvents]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 8)
      .map(({ id, action, patient, time }) => ({ id, action, patient, time }));
  }, [payload.orders, payload.results, payload.items]);

  const recentOrders = useMemo<RecentOrderRow[]>(() => {
    const list = [...(payload.orders || [])];
    list.sort((a, b) => {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return db - da;
    });
    return list.slice(0, 12);
  }, [payload.orders]);

  const refresh = useCallback(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  return {
    labId,
    loading: staffLoading || loading,
    stats,
    activity,
    recentOrders,
    refresh,
  };
}
