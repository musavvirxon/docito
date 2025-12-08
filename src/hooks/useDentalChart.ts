import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ToothRecord {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  tooth_number: number;
  tooth_type: "permanent" | "primary";
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DentalProcedure {
  id: string;
  name: string;
  code: string | null;
  category: string;
  description: string | null;
  default_cost: number | null;
  is_pediatric: boolean;
  is_active: boolean;
}

export interface ToothProcedureHistory {
  id: string;
  tooth_record_id: string | null;
  patient_id: string;
  doctor_id: string | null;
  appointment_id: string | null;
  procedure_id: string | null;
  procedure_name: string;
  tooth_numbers: number[];
  status: "planned" | "in_progress" | "completed" | "cancelled";
  cost: number | null;
  notes: string | null;
  performed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useDentalChart = (patientId?: string) => {
  const { user } = useAuth();
  const [toothRecords, setToothRecords] = useState<ToothRecord[]>([]);
  const [procedures, setProcedures] = useState<DentalProcedure[]>([]);
  const [procedureHistory, setProcedureHistory] = useState<ToothProcedureHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [isVerifiedDentist, setIsVerifiedDentist] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  // Check if current user is a verified dentist
  const checkDentistVerification = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc("is_verified_dentist", {
        p_user_id: user.id,
      });

      if (error) throw error;
      setIsVerifiedDentist(data === true);

      // Get doctor ID if verified
      if (data) {
        const { data: doctorData } = await supabase
          .from("doctors")
          .select("id")
          .eq("user_id", user.id)
          .single();
        
        if (doctorData) {
          setDoctorId(doctorData.id);
        }
      }
    } catch (err) {
      console.error("Error checking dentist verification:", err);
      setIsVerifiedDentist(false);
    }
  }, [user]);

  // Fetch dental procedures catalog
  const fetchProcedures = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("dental_procedures")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true });

      if (error) throw error;
      setProcedures(data || []);
    } catch (err) {
      console.error("Error fetching dental procedures:", err);
    }
  }, []);

  // Fetch tooth records for a patient
  const fetchToothRecords = useCallback(async () => {
    if (!patientId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tooth_records")
        .select("*")
        .eq("patient_id", patientId)
        .order("tooth_number", { ascending: true });

      if (error) throw error;
      setToothRecords(data || []);
    } catch (err) {
      console.error("Error fetching tooth records:", err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Fetch procedure history for a patient
  const fetchProcedureHistory = useCallback(async () => {
    if (!patientId) return;

    try {
      const { data, error } = await supabase
        .from("tooth_procedure_history")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProcedureHistory(data || []);
    } catch (err) {
      console.error("Error fetching procedure history:", err);
    }
  }, [patientId]);

  // Create or update tooth record
  const upsertToothRecord = useCallback(async (
    toothNumber: number,
    toothType: "permanent" | "primary",
    status: string,
    notes?: string
  ) => {
    if (!patientId || !doctorId) {
      toast.error("Missing patient or doctor information");
      return null;
    }

    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from("tooth_records")
        .select("id")
        .eq("patient_id", patientId)
        .eq("tooth_number", toothNumber)
        .single();

      let data;
      if (existing) {
        // Update existing
        const { data: updated, error } = await supabase
          .from("tooth_records")
          .update({
            status: status as any,
            tooth_type: toothType,
            notes,
          })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        data = updated;
      } else {
        // Insert new
        const { data: inserted, error } = await supabase
          .from("tooth_records")
          .insert({
            patient_id: patientId,
            doctor_id: doctorId,
            tooth_number: toothNumber,
            tooth_type: toothType,
            status: status as any,
            notes,
          })
          .select()
          .single();
        if (error) throw error;
        data = inserted;
      }
      
      await fetchToothRecords();
      return data;
    } catch (err: any) {
      console.error("Error upserting tooth record:", err);
      toast.error("Failed to update tooth record");
      return null;
    }
  }, [patientId, doctorId, fetchToothRecords]);

  // Add procedure to teeth
  const addProcedureToTeeth = useCallback(async (
    toothNumbers: number[],
    procedureId: string | null,
    procedureName: string,
    status: "planned" | "in_progress" | "completed" = "planned",
    cost?: number,
    notes?: string,
    appointmentId?: string
  ) => {
    if (!patientId || !doctorId) {
      toast.error("Missing patient or doctor information");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("tooth_procedure_history")
        .insert({
          patient_id: patientId,
          doctor_id: doctorId,
          appointment_id: appointmentId || null,
          procedure_id: procedureId,
          procedure_name: procedureName,
          tooth_numbers: toothNumbers,
          status,
          cost,
          notes,
          performed_at: status === "completed" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success(`${procedureName} added to ${toothNumbers.length} tooth${toothNumbers.length > 1 ? "es" : ""}`);
      await fetchProcedureHistory();
      await fetchToothRecords(); // Refresh as trigger may have updated status
      return data;
    } catch (err: any) {
      console.error("Error adding procedure:", err);
      toast.error("Failed to add procedure");
      return null;
    }
  }, [patientId, doctorId, fetchProcedureHistory, fetchToothRecords]);

  // Update procedure status
  const updateProcedureStatus = useCallback(async (
    procedureHistoryId: string,
    status: "planned" | "in_progress" | "completed" | "cancelled"
  ) => {
    try {
      const { error } = await supabase
        .from("tooth_procedure_history")
        .update({
          status,
          performed_at: status === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", procedureHistoryId);

      if (error) throw error;
      
      toast.success(`Procedure ${status}`);
      await fetchProcedureHistory();
      await fetchToothRecords();
    } catch (err: any) {
      console.error("Error updating procedure status:", err);
      toast.error("Failed to update procedure status");
    }
  }, [fetchProcedureHistory, fetchToothRecords]);

  // Initialize
  useEffect(() => {
    checkDentistVerification();
    fetchProcedures();
  }, [checkDentistVerification, fetchProcedures]);

  useEffect(() => {
    if (patientId && isVerifiedDentist) {
      fetchToothRecords();
      fetchProcedureHistory();
    }
  }, [patientId, isVerifiedDentist, fetchToothRecords, fetchProcedureHistory]);

  return {
    toothRecords,
    procedures,
    procedureHistory,
    loading,
    isVerifiedDentist,
    doctorId,
    fetchToothRecords,
    fetchProcedureHistory,
    upsertToothRecord,
    addProcedureToTeeth,
    updateProcedureStatus,
    refetch: () => {
      fetchToothRecords();
      fetchProcedureHistory();
    },
  };
};
