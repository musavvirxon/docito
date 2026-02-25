// File: src/hooks/useImagingStaffDashboard.ts
// FULL FILE REPLACEMENT

import { useCallback, useEffect, useMemo, useState } from "react";
import { subDays } from "date-fns";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useStaffContext } from "@/hooks/useStaffContext";

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

type ReferralRow = {
  id: string;
  created_at: string;
  updated_at: string;
  accepted_at?: string | null;
  completed_at?: string | null;
  status?: string | null;
  priority?: string | null;
  reason?: string | null;
  attachments?: unknown;
  patient_name?: string | null;
  patient_snapshot_full_name?: string | null;
  patient_snapshot_gender?: string | null;
  patient_snapshot_dob?: string | null;
  referrer_user_id?: string | null;
  referrer_entity_id?: string | null;
};

type ImagingOrderStateRow = {
  referral_id: string;
  workflow_status?: string | null;
  priority?: string | null;
  modality?: string | null;
  study_type?: string | null;
  exam_name?: string | null;
  body_part?: string | null;
  preferred_date?: string | null;
  preferred_time_slot?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ImagingReportRow = {
  referral_id: string;
  status?: string | null;
  created_at?: string | null;
  finalized_at?: string | null;
  delivered_at?: string | null;
  updated_at?: string | null;
};

type RecentImagingOrder = {
  id: string;
  created_at: string;
  updated_at?: string | null;
  accepted_at?: string | null;
  completed_at?: string | null;
  status?: string | null;
  priority?: string | null;
  modality?: string | null;
  study_type?: string | null;
  exam_name?: string | null;
  body_part?: string | null;
  preferred_date?: string | null;
  preferred_time_slot?: string | null;
  patient_name?: string | null;
  doctor_name?: string | null;
  report_status?: string | null;
};

type DashboardPayload = {
  orders: RecentImagingOrder[];
  reports: ImagingReportRow[];
};

type JsonObj = Record<string, unknown>;

function normalizeStatus(status?: string | null) {
  return (status || "").toLowerCase().trim();
}

function titleCaseStatus(status?: string | null) {
  return (status || "updated")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function chunk<T>(arr: T[], size = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function safeObj(v: unknown): JsonObj {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as JsonObj;
  return {};
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function parseReferralDetails(ref: ReferralRow) {
  const a = safeObj(ref.attachments);

  const modality =
    asString(a.modality) ||
    asString(a.imaging_modality) ||
    asString(a.exam_modality) ||
    asString(a.study_modality) ||
    "X-ray";

  const studyType =
    asString(a.study_type) ||
    asString(a.scan_type) ||
    asString(a.exam_type) ||
    modality;

  const examName =
    asString(a.exam_name) ||
    asString(a.study_name) ||
    asString(a.test_name) ||
    ref.reason ||
    "Imaging Study";

  const bodyPart =
    asString(a.body_part) ||
    asString(a.anatomy) ||
    asString(a.region) ||
    "";

  const preferredDate =
    asString(a.preferred_date) ||
    asString(a.scheduled_date) ||
    "";

  const preferredTimeSlot =
    asString(a.preferred_time_slot) ||
    asString(a.scheduled_time) ||
    "";

  return {
    modality,
    studyType,
    examName,
    bodyPart,
    preferredDate: preferredDate || null,
    preferredTimeSlot: preferredTimeSlot || null,
  };
}

function patientLabel(order: Partial<RecentImagingOrder>) {
  return order.patient_name || "Patient";
}

export function useImagingStaffDashboard() {
  const { entityInfo, loading: staffLoading } = useStaffContext();
  const imagingCenterId = entityInfo?.id || "";

  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<DashboardPayload>({
    orders: [],
    reports: [],
  });

  const fetchDashboard = useCallback(async () => {
    if (!imagingCenterId) {
      setPayload({ orders: [], reports: [] });
      return;
    }

    try {
      setLoading(true);

      const sinceIso = subDays(new Date(), 120).toISOString();

      // Referrals are the base imaging "orders"
      const { data: referralsData, error: referralsError } = await supabase
        .from("referrals")
        .select(
          [
            "id",
            "created_at",
            "updated_at",
            "accepted_at",
            "completed_at",
            "status",
            "priority",
            "reason",
            "attachments",
            "patient_name",
            "patient_snapshot_full_name",
            "patient_snapshot_gender",
            "patient_snapshot_dob",
            "referrer_user_id",
            "referrer_entity_id",
          ].join(","),
        )
        .eq("receiver_type", "imaging_center")
        .eq("receiver_entity_id", imagingCenterId)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(500);

      if (referralsError) throw referralsError;

      const referrals = ((referralsData || []) as any[]) as ReferralRow[];
      const referralIds = referrals.map((r) => r.id);

      let workflowRows: ImagingOrderStateRow[] = [];
      let reportRows: ImagingReportRow[] = [];

      // Imaging workflow state (optional custom table)
      if (referralIds.length > 0) {
        try {
          const responses = await Promise.all(
            chunk(referralIds, 500).map((ids) =>
              (supabase.from as any)("imaging_order_state")
                .select(
                  "referral_id,workflow_status,priority,modality,study_type,exam_name,body_part,preferred_date,preferred_time_slot,created_at,updated_at",
                )
                .eq("imaging_center_id", imagingCenterId)
                .in("referral_id", ids),
            ),
          );

          for (const r of responses) {
            if (r.error) throw r.error;
            workflowRows.push(...(((r.data || []) as any[]) as ImagingOrderStateRow[]));
          }
        } catch (e) {
          console.warn("imaging_order_state unavailable or restricted:", e);
          workflowRows = [];
        }

        // Imaging reports (optional custom table)
        try {
          const responses = await Promise.all(
            chunk(referralIds, 500).map((ids) =>
              (supabase.from as any)("imaging_reports")
                .select("referral_id,status,created_at,finalized_at,delivered_at,updated_at")
                .eq("imaging_center_id", imagingCenterId)
                .in("referral_id", ids),
            ),
          );

          for (const r of responses) {
            if (r.error) throw r.error;
            reportRows.push(...(((r.data || []) as any[]) as ImagingReportRow[]));
          }
        } catch (e) {
          console.warn("imaging_reports unavailable or restricted:", e);
          reportRows = [];
        }
      }

      // Optional profile lookup for referrer names
      const referrerIds = Array.from(
        new Set(referrals.map((r) => r.referrer_user_id).filter(Boolean)),
      ) as string[];

      const profileNameMap = new Map<string, string>();
      if (referrerIds.length > 0) {
        try {
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("user_id,id,full_name,first_name,last_name")
            .in("user_id", referrerIds as any);

          if (profilesError) {
            // fallback if schema uses id instead of user_id
            const { data: profiles2, error: profilesError2 } = await supabase
              .from("profiles")
              .select("user_id,id,full_name,first_name,last_name")
              .in("id", referrerIds as any);

            if (profilesError2) throw profilesError2;

            for (const p of ((profiles2 || []) as any[])) {
              const key = p.user_id || p.id;
              const name =
                p.full_name ||
                [p.first_name, p.last_name].filter(Boolean).join(" ") ||
                "Doctor";
              if (key) profileNameMap.set(String(key), String(name));
            }
          } else {
            for (const p of ((profiles || []) as any[])) {
              const key = p.user_id || p.id;
              const name =
                p.full_name ||
                [p.first_name, p.last_name].filter(Boolean).join(" ") ||
                "Doctor";
              if (key) profileNameMap.set(String(key), String(name));
            }
          }
        } catch (e) {
          console.warn("profiles lookup unavailable or restricted:", e);
        }
      }

      const workflowByReferral = new Map<string, ImagingOrderStateRow>();
      for (const row of workflowRows) {
        if (row.referral_id) workflowByReferral.set(row.referral_id, row);
      }

      const reportByReferral = new Map<string, ImagingReportRow>();
      for (const row of reportRows) {
        if (row.referral_id) reportByReferral.set(row.referral_id, row);
      }

      const enrichedOrders: RecentImagingOrder[] = referrals.map((ref) => {
        const wf = workflowByReferral.get(ref.id);
        const rep = reportByReferral.get(ref.id);
        const parsed = parseReferralDetails(ref);

        const mergedStatus =
          wf?.workflow_status ||
          (rep?.status && ["delivered", "finalized"].includes(normalizeStatus(rep.status)) ? "awaiting_delivery" : null) ||
          ref.status ||
          "pending";

        const finalStatus =
          rep?.delivered_at || normalizeStatus(rep?.status) === "delivered"
            ? "delivered"
            : rep?.finalized_at || normalizeStatus(rep?.status) === "finalized"
              ? "result_ready"
              : mergedStatus;

        const doctorName =
          (ref.referrer_user_id && profileNameMap.get(ref.referrer_user_id)) ||
          undefined;

        return {
          id: ref.id,
          created_at: ref.created_at,
          updated_at: wf?.updated_at || rep?.updated_at || ref.updated_at,
          accepted_at: ref.accepted_at || null,
          completed_at: rep?.delivered_at || rep?.finalized_at || ref.completed_at || null,
          status: finalStatus || "pending",
          priority: wf?.priority || ref.priority || null,
          modality: wf?.modality || parsed.modality || null,
          study_type: wf?.study_type || parsed.studyType || null,
          exam_name: wf?.exam_name || parsed.examName || null,
          body_part: wf?.body_part || parsed.bodyPart || null,
          preferred_date: wf?.preferred_date || parsed.preferredDate || null,
          preferred_time_slot: wf?.preferred_time_slot || parsed.preferredTimeSlot || null,
          patient_name: ref.patient_snapshot_full_name || ref.patient_name || "Patient",
          doctor_name: doctorName || "Doctor",
          report_status: rep?.status || null,
        };
      });

      setPayload({
        orders: enrichedOrders,
        reports: reportRows,
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load imaging dashboard");
      setPayload({ orders: [], reports: [] });
    } finally {
      setLoading(false);
    }
  }, [imagingCenterId]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const stats = useMemo<Stat[]>(() => {
    const list = payload.orders || [];
    const norm = normalizeStatus;

    const pending = list.filter((o) => ["pending", "new"].includes(norm(o.status))).length;
    const scheduled = list.filter((o) => ["scheduled", "booked"].includes(norm(o.status))).length;
    const inProgress = list.filter((o) =>
      ["checked_in", "in_progress", "images_ready", "awaiting_report"].includes(norm(o.status)),
    ).length;
    const completed = list.filter((o) =>
      ["completed", "done", "result_ready", "delivered"].includes(norm(o.status)),
    ).length;

    return [
      { title: "Total Orders", value: String(list.length), trend: "neutral" },
      { title: "Pending / Scheduled", value: String(pending + scheduled), trend: "neutral" },
      { title: "In Progress", value: String(inProgress), trend: "neutral" },
      { title: "Completed", value: String(completed), trend: "neutral" },
    ];
  }, [payload.orders]);

  const activity = useMemo<ActivityItem[]>(() => {
    const orders = payload.orders || [];
    const reports = payload.reports || [];
    const orderMap = new Map(orders.map((o) => [o.id, o]));

    const orderEvents = orders.slice(0, 20).map((o) => ({
      id: `order-${o.id}`,
      ts: new Date(o.updated_at || o.created_at || 0).getTime(),
      action: `${o.modality || "Imaging"} ${titleCaseStatus(o.status)}`,
      patient: patientLabel(o),
      time:
        o.updated_at || o.created_at
          ? new Date(o.updated_at || o.created_at).toLocaleString()
          : "",
    }));

    const reportEvents = reports.slice(0, 20).map((r) => {
      const order = r.referral_id ? orderMap.get(r.referral_id) : undefined;
      const when = r.delivered_at || r.finalized_at || r.updated_at || r.created_at || null;
      const status =
        r.delivered_at
          ? "delivered"
          : r.finalized_at
            ? "finalized"
            : r.status || "updated";

      return {
        id: `report-${r.referral_id || Math.random()}`,
        ts: when ? new Date(when).getTime() : 0,
        action: `Report ${titleCaseStatus(status)}`,
        patient: patientLabel(order || {}),
        time: when ? new Date(when).toLocaleString() : "",
      };
    });

    return [...orderEvents, ...reportEvents]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 8)
      .map(({ id, action, patient, time }) => ({ id, action, patient, time }));
  }, [payload.orders, payload.reports]);

  const recentOrders = useMemo<RecentImagingOrder[]>(() => {
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
    imagingCenterId,
    loading: staffLoading || loading,
    stats,
    activity,
    recentOrders,
    refresh,
  };
}
