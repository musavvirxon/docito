import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration?: string;
  doctor_name?: string;
  start_date: string;
  end_date?: string;
  status: "active" | "completed" | "cancelled";
  instructions?: string;
}

export const usePatientPrescriptions = (patientId: string) => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrescriptions = useCallback(async () => {
    if (!user || !patientId) return;

    try {
      const { data, error } = await supabase
        .from("medications")
        .select(`
          id,
          name,
          dosage,
          frequency,
          instructions,
          start_date,
          end_date,
          status,
          doctor_id,
          doctors!medications_doctor_id_fkey(
            id,
            user_id,
            profiles!fk_doctors_user_id(full_name)
          )
        `)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted: Prescription[] = (data || []).map((med: any) => {
        const isActive = med.status === "active" && (!med.end_date || new Date(med.end_date) >= new Date());
        const doctorProfile = med.doctors?.profiles;
        
        return {
          id: med.id,
          medication: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          instructions: med.instructions,
          start_date: med.start_date,
          end_date: med.end_date,
          status: isActive ? "active" : (med.status === "cancelled" ? "cancelled" : "completed"),
          doctor_name: doctorProfile?.full_name,
        };
      });

      setPrescriptions(formatted);
    } catch (err) {
      console.error("Error fetching prescriptions:", err);
      toast.error("Failed to load prescriptions");
    } finally {
      setLoading(false);
    }
  }, [user, patientId]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const addPrescription = async (prescription: {
    medication: string;
    dosage: string;
    frequency: string;
    instructions?: string;
    start_date: string;
    end_date?: string;
  }) => {
    if (!user) return;

    try {
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!doctorData) throw new Error("Doctor profile not found");

      const { error } = await supabase.from("medications").insert({
        patient_id: patientId,
        doctor_id: doctorData.id,
        name: prescription.medication,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        instructions: prescription.instructions,
        start_date: prescription.start_date,
        end_date: prescription.end_date,
        status: "active",
      });

      if (error) throw error;

      toast.success("Prescription added successfully");
      fetchPrescriptions();
    } catch (err) {
      console.error("Error adding prescription:", err);
      toast.error("Failed to add prescription");
    }
  };

  return { prescriptions, loading, refetch: fetchPrescriptions, addPrescription };
};
