// src/hooks/useImagingOrders.ts

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type ImagingWorkflowStatus =
  | "scheduled"
  | "checked_in"
  | "in_progress"
  | "images_ready"
  | "awaiting_report"
  | "completed"
  | "delivered"
  | "cancelled";

export interface ImagingOrder {
  id: string; // referral_id
  order_number: string;
  imaging_center_id: string;

  patient_id: string | null;
  facility_patient_id: string | null;
  patient_name?: string;

  doctor_id?: string | null;
  doctor_name?: string | null;

  modality: string;
  exam_name: string;
  body_part?: string | null;

  priority: "routine" | "urgent" | "stat";
  clinical_notes?: string | null;

  status: ImagingWorkflowStatus;

  preferred_date?: string | null;
  preferred_time_slot?: string | null;

  notes?: string | null;
  created_at: string;
  updated_at: string;

  attachments?: any;
  result_attachments?: any;
}

type ReferralRow = {
  id: string;
  referral_number: string | null;
  receiver_entity_id: string | null;

  patient_id: string | null;
  facility_patient_id: string | null;
  patient_name: string | null;

  reason: string | null;
  clinical_notes: string | null;
  notes: string | null;

  attachments: any;
  result_attachments: any;

  priority: "routine" | "urgent" | "stat" | null;
  preferred_date: string | null;
  preferred_time_slot: string | null;

  created_at: string;
  updated_at: string;
};

type OrderStateRow = {
  referral_id: string;
  imaging_center_id: string;
  workflow_status: ImagingWorkflowStatus;
  priority: "routine" | "urgent" | "stat";
  updated_at: string;
};

function safeObj(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

function pickExam(attachments: any, fallbackReason: string | null) {
  const a = safeObj(attachments);
  const examName = String((a.exam_name as string) || fallbackReason || "Imaging Exam");
  const modality = String((a.modality as string) || "X-ray");
  const bodyPart = a.body_part ? String(a.body_part) : null;
  const contrast = typeof a.contrast === "boolean" ? a.contrast : false;
  return { examName, modality, bodyPart, contrast };
}

export function useImagingOrders() {
  const [orders, setOrders] = useState<ImagingOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCenterOrders = useCallback(async (centerId: string) => {
    setLoading(true);
    try {
      const { data: refData, error: refErr } = await (supabase.from as any)("referrals")
        .select(
          "id, referral_number, receiver_entity_id, patient_id, facility_patient_id, patient_name, reason, clinical_notes, notes, attachments, result_attachments, priority, preferred_date, preferred_time_slot, created_at, updated_at",
        )
        .eq("receiver_type", "imaging_center")
        .eq("receiver_entity_id", centerId)
        .order("created_at", { ascending: false })
        .limit(250);

      if (refErr) throw refErr;

      const referrals = (refData || []) as ReferralRow[];
      const referralIds = referrals.map((r) => r.id);

      const stateMap: Record<string, OrderStateRow> = {};
      if (referralIds.length) {
        const { data: stData, error: stErr } = await (supabase.from as any)("imaging_order_state")
          .select("referral_id, imaging_center_id, workflow_status, priority, updated_at")
          .eq("imaging_center_id", centerId)
          .in("referral_id", referralIds);

        if (stErr) throw stErr;

        for (const s of (stData || []) as OrderStateRow[]) {
          stateMap[s.referral_id] = s;
        }
      }

      const transformed: ImagingOrder[] = referrals.map((r) => {
        const st = stateMap[r.id];
        const { examName, modality, bodyPart } = pickExam(r.attachments, r.reason);
        const orderNumber = r.referral_number || `IMG-${r.id.slice(0, 8).toUpperCase()}`;

        const workflowStatus: ImagingWorkflowStatus = (st?.workflow_status as ImagingWorkflowStatus) || "scheduled";

        return {
          id: r.id,
          order_number: orderNumber,
          imaging_center_id: centerId,
          patient_id: r.patient_id,
          facility_patient_id: r.facility_patient_id,
          patient_name: r.patient_name || "Patient",
          doctor_id: null,
          doctor_name: null,
          modality,
          exam_name: examName,
          body_part: bodyPart,
          priority: (st?.priority as any) || (r.priority as any) || "routine",
          clinical_notes: r.clinical_notes || null,
          status: workflowStatus,
          preferred_date: r.preferred_date || null,
          preferred_time_slot: r.preferred_time_slot || null,
          notes: r.notes || null,
          created_at: r.created_at,
          updated_at: r.updated_at,
          attachments: r.attachments,
          result_attachments: r.result_attachments,
        };
      });

      setOrders(transformed);
    } catch (error: unknown) {
      console.error("Error fetching imaging orders:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrderStatus = useCallback(async (referralId: string, centerId: string, newStatus: ImagingWorkflowStatus) => {
    setLoading(true);
    try {
      const nowIso = new Date().toISOString();

      const { error } = await (supabase.from as any)("imaging_order_state").upsert(
        {
          referral_id: referralId,
          imaging_center_id: centerId,
          workflow_status: newStatus,
          updated_at: nowIso,
        },
        { onConflict: "referral_id" },
      );

      if (error) throw error;

      setOrders((prev) => prev.map((o) => (o.id === referralId ? { ...o, status: newStatus } : o)));
      toast({ title: "Success", description: "Workflow updated" });
    } catch (error: unknown) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const mergeResultAttachments = useCallback(async (referralId: string, patch: Record<string, unknown>) => {
    setLoading(true);
    try {
      const { data: cur, error: curErr } = await supabase
        .from("referrals")
        .select("result_attachments")
        .eq("id", referralId)
        .maybeSingle();

      if (curErr) throw curErr;

      const existing = (cur as any)?.result_attachments ?? {};
      const existingObj = Array.isArray(existing) ? {} : safeObj(existing);
      const merged = { ...existingObj, ...patch };

      const { error: updErr } = await supabase
        .from("referrals")
        .update({ result_attachments: merged })
        .eq("id", referralId);

      if (updErr) throw updErr;

      setOrders((prev) =>
        prev.map((o) => (o.id === referralId ? { ...o, result_attachments: merged } : o)),
      );

      toast({ title: "Success", description: "Order updated" });
    } catch (error: unknown) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    orders,
    loading,
    fetchCenterOrders,
    updateOrderStatus,
    mergeResultAttachments,
  };
}
