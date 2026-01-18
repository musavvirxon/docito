// File: src/hooks/usePrescriptions.ts

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface PrescriptionItem {
  id?: string;
  prescription_id?: string;
  medication_name: string;
  medication_code?: string;
  dosage: string;
  frequency: string;
  quantity: number;
  unit?: string;
  instructions?: string;
  substitutions_allowed?: boolean;
}

export interface Prescription {
  id: string;
  prescription_number: string;
  patient_id: string;
  doctor_id?: string;
  pharmacy_id?: string;
  appointment_id?: string;
  status: string;
  prescribed_at: string;
  expires_at?: string;
  refills_remaining: number;
  refills_total: number;
  notes?: string;
  diagnosis_code?: string;
  items?: PrescriptionItem[];
  patient?: any;
  doctor?: any;
  pharmacy?: any;
}

export interface FulfillmentOrder {
  id: string;
  order_number: string;
  prescription_id: string;
  pharmacy_id: string;
  patient_id: string;
  status: string;
  priority: string;
  total_amount?: number;
  insurance_amount?: number;
  copay_amount?: number;
  payment_status: string;
  pickup_method: string;
  estimated_ready_at?: string;
  ready_at?: string;
  picked_up_at?: string;
  prescription?: Prescription;
}

interface RpcResponse {
  success: boolean;
  error?: string;
  prescription_id?: string;
  fulfillment_id?: string;
}

export const usePrescriptions = (options?: { doctorId?: string; patientId?: string; pharmacyId?: string }) => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [fulfillmentOrders, setFulfillmentOrders] = useState<FulfillmentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const debounceRef = useRef<number | null>(null);

  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("prescriptions")
        .select(
          `
          *,
          prescription_items (*)
        `,
        )
        .order("created_at", { ascending: false });

      if (options?.doctorId) query = query.eq("doctor_id", options.doctorId);
      if (options?.patientId) query = query.eq("patient_id", options.patientId);
      if (options?.pharmacyId) query = query.eq("pharmacy_id", options.pharmacyId);

      const { data, error } = await query;
      if (error) throw error;

      const formatted =
        data?.map((p: any) => ({
          ...p,
          items: p.prescription_items,
        })) || [];

      setPrescriptions(formatted as Prescription[]);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
    } finally {
      setLoading(false);
    }
  }, [options?.doctorId, options?.patientId, options?.pharmacyId]);

  const fetchFulfillmentOrders = useCallback(async () => {
    if (!options?.pharmacyId) return;

    try {
      const { data, error } = await supabase
        .from("fulfillment_orders")
        .select(
          `
          *,
          prescriptions (
            *,
            prescription_items (*)
          )
        `,
        )
        .eq("pharmacy_id", options.pharmacyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted =
        data?.map((o: any) => ({
          ...o,
          prescription: o.prescriptions,
        })) || [];

      setFulfillmentOrders(formatted as FulfillmentOrder[]);
    } catch (error) {
      console.error("Error fetching fulfillment orders:", error);
    }
  }, [options?.pharmacyId]);

  useEffect(() => {
    fetchPrescriptions();
    if (options?.pharmacyId) fetchFulfillmentOrders();
  }, [fetchFulfillmentOrders, fetchPrescriptions, options?.pharmacyId]);

  // Realtime: prescriptions + fulfillment orders
  useEffect(() => {
    const schedule = (fn: () => void) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(fn, 350);
    };

    const channels: any[] = [];

    // Prescriptions
    const prescFilter =
      options?.pharmacyId
        ? `pharmacy_id=eq.${options.pharmacyId}`
        : options?.doctorId
          ? `doctor_id=eq.${options.doctorId}`
          : options?.patientId
            ? `patient_id=eq.${options.patientId}`
            : null;

    const prescChannel = supabase.channel(`rx-live-${prescFilter ?? "all"}`);
    prescChannel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "prescriptions", ...(prescFilter ? { filter: prescFilter } : {}) },
      () => schedule(fetchPrescriptions),
    );
    prescChannel.subscribe();
    channels.push(prescChannel);

    // Fulfillment orders (pharmacy only)
    if (options?.pharmacyId) {
      const foChannel = supabase.channel(`fulfillment-live-${options.pharmacyId}`);
      foChannel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fulfillment_orders", filter: `pharmacy_id=eq.${options.pharmacyId}` },
        () => schedule(fetchFulfillmentOrders),
      );
      foChannel.subscribe();
      channels.push(foChannel);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      for (const ch of channels) supabase.removeChannel(ch);
    };
  }, [fetchFulfillmentOrders, fetchPrescriptions, options?.doctorId, options?.patientId, options?.pharmacyId, user?.id]);

  const createPrescription = async (
    patientId: string,
    doctorId: string,
    items: PrescriptionItem[],
    refills: number = 0,
    notes?: string,
  ) => {
    try {
      const jsonItems = items.map((item) => ({
        medication_name: item.medication_name,
        medication_code: item.medication_code || null,
        dosage: item.dosage,
        frequency: item.frequency,
        quantity: item.quantity,
        unit: item.unit || "tablets",
        instructions: item.instructions || null,
        substitutions_allowed: item.substitutions_allowed ?? true,
      }));

      const { data, error } = await supabase.rpc("create_prescription", {
        p_patient_id: patientId,
        p_doctor_id: doctorId,
        p_items: jsonItems,
        p_refills: refills,
        p_notes: notes,
      });

      if (error) throw error;

      const response = data as unknown as RpcResponse;
      if (!response.success) throw new Error(response.error);

      toast.success("Prescription created successfully");
      fetchPrescriptions();
      return response.prescription_id;
    } catch (error: any) {
      toast.error(error.message || "Failed to create prescription");
      throw error;
    }
  };

  const sendToPharmacy = async (prescriptionId: string, pharmacyId: string) => {
    try {
      const { data, error } = await supabase.rpc("send_prescription_to_pharmacy", {
        p_prescription_id: prescriptionId,
        p_pharmacy_id: pharmacyId,
      });

      if (error) throw error;

      const response = data as unknown as RpcResponse;
      if (!response.success) throw new Error(response.error);

      toast.success("Prescription sent to pharmacy");
      fetchPrescriptions();
      return response.fulfillment_id;
    } catch (error: any) {
      toast.error(error.message || "Failed to send prescription");
      throw error;
    }
  };

  const processFulfillment = async (fulfillmentId: string, action: string, notes?: string) => {
    try {
      const { data, error } = await supabase.rpc("process_fulfillment_order", {
        p_fulfillment_id: fulfillmentId,
        p_action: action,
        p_notes: notes,
      });

      if (error) throw error;

      const response = data as unknown as RpcResponse;
      if (!response.success) throw new Error(response.error);

      toast.success(`Order ${action.replace("_", " ")}`);
      fetchFulfillmentOrders();
      return response;
    } catch (error: any) {
      toast.error(error.message || "Failed to process order");
      throw error;
    }
  };

  return {
    prescriptions,
    fulfillmentOrders,
    loading,
    createPrescription,
    sendToPharmacy,
    processFulfillment,
    fetchPrescriptions,
    fetchFulfillmentOrders,
  };
};
