// src/hooks/useDoctorIntegration.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Unified types for all doctor data
export interface DoctorProfile {
  id: string;
  user_id: string;
  specialty: string;
  bio?: string;
  verified: boolean;
  license_number?: string;
  consultation_fee?: number;
  accepts_new_patients: boolean;
  average_rating: number;
  num_reviews: number;
  weighted_rating: number;
  appointment_count: number;
  practice_id?: string;
  profiles?: {
    full_name: string;
    email: string;
    avatar_url?: string;
    phone?: string;
  };
  practices?: {
    name: string;
    city: string;
    country: string;
    verified: boolean;
  };
}

export interface DoctorService {
  id: string;
  dentist_id: string;
  name: string;
  description?: string;
  category: string;
  default_cost?: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiagnosisTemplate {
  id: string;
  doctor_id: string;
  title: string;
  icd10_code?: string | null;
  description?: string | null;
  tags?: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  doctor_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string | null;
  patient_id?: string | null;
  doctor_patient_id?: string | null;
  consultation_type?: string | null;
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
  patient_avatar?: string;
}

export interface DoctorStats {
  totalPatients: number;
  totalAppointments: number;
  totalRevenue: number;
  averageRating: number;
  numReviews: number;
  profileCompletion: number;
}

export interface TreatmentPlan {
  id: string;
  title: string;
  status: string;
  patient_id: string | null;
  doctor_patient_id?: string | null;
  doctor_id: string;
  total_cost: number;
  created_at: string;
  updated_at: string;
}

type Result = { success?: boolean; error?: string };

// Custom hook for unified doctor data management
export const useDoctorIntegration = () => {
  const { user, profile } = useAuth();

  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [services, setServices] = useState<DoctorService[]>([]);
  const [diagnoses, setDiagnoses] = useState<DiagnosisTemplate[]>([]);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);

  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [todaysAppointments, setTodaysAppointments] = useState<Appointment[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);

  const [stats, setStats] = useState<DoctorStats>({
    totalPatients: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    averageRating: 0,
    numReviews: 0,
    profileCompletion: 0,
  });

  const [loading, setLoading] = useState(true);
  const refreshSeq = useRef(0);

  const doctorIdFromProfile = useMemo(() => (profile as any)?.doctor_id as string | undefined, [profile]);

  const calculateProfileCompletion = (p: DoctorProfile): number => {
    let completion = 0;
    const totalFields = 7;
    if (p.profiles?.avatar_url) completion += 1;
    if (p.specialty) completion += 1;
    if (p.bio) completion += 1;
    if (p.license_number) completion += 1;
    if (p.consultation_fee) completion += 1;
    if (p.profiles?.phone) completion += 1;
    if (p.practice_id || p.verified) completion += 1;
    return Math.round((completion / totalFields) * 100);
  };

  // Profile operations - uses denormalized doctor_id from profile
  const fetchDoctorProfile = useCallback(async () => {
    if (!user || profile?.role !== "doctor") return null;
    const doctorId = doctorIdFromProfile;

    if (!doctorId) {
      toast.error("Doctor profile still loading. Please refresh the page.");
      console.error("Missing doctor_id on profile");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("doctors")
        .select(
          `
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url,
            phone
          ),
          practices:practice_id (
            name,
            city,
            country,
            verified
          )
        `
        )
        .eq("id", doctorId)
        .single();

      if (error) throw error;
      setDoctorProfile(data as any);
      return data as any;
    } catch (err: any) {
      console.error("Error fetching doctor profile:", err);
      toast.error(`Profile error: ${err.message}`);
      return null;
    }
  }, [doctorIdFromProfile, profile?.role, user]);

  // Services (procedures)
  const fetchServices = useCallback(async () => {
    if (!doctorProfile) return;

    try {
      const { data, error } = await supabase
        .from("procedures")
        .select("*")
        .eq("dentist_id", doctorProfile.id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      setServices((data || []) as any);
    } catch (err: any) {
      console.error("Error fetching services:", err);
    }
  }, [doctorProfile]);

  // Diagnosis Library (using procedure_templates table)
  const fetchDiagnoses = useCallback(async () => {
    if (!doctorProfile) return;
    setDiagnosisLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("procedure_templates")
        .select("id, doctor_id, name, code, description, category, is_active, created_at, updated_at")
        .eq("doctor_id", doctorProfile.id)
        .order("name", { ascending: true });
      if (error) throw error;
      // Map to expected diagnosis format
      const mappedData = (data || []).map((item: any) => ({
        id: item.id,
        doctor_id: item.doctor_id,
        title: item.name,
        icd10_code: item.code,
        description: item.description,
        tags: item.category ? [item.category] : [],
        is_active: item.is_active,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
      setDiagnoses(mappedData as any);
    } catch (err: any) {
      console.error("Error fetching diagnoses:", err);
      setDiagnoses([]);
    } finally {
      setDiagnosisLoading(false);
    }
  }, [doctorProfile]);

  // Appointments (fast + correct patient data)
  const fetchAppointments = useCallback(async () => {
    if (!doctorProfile) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const [{ data: upcoming }, { data: recent }] = await Promise.all([
        supabase
          .from("appointments")
          .select(
            "id, doctor_id, appointment_date, start_time, end_time, status, notes, patient_id, doctor_patient_id, consultation_type"
          )
          .eq("doctor_id", doctorProfile.id)
          .gte("appointment_date", today)
          .in("status", ["pending", "confirmed"])
          .order("appointment_date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(25),
        supabase
          .from("appointments")
          .select(
            "id, doctor_id, appointment_date, start_time, end_time, status, notes, patient_id, doctor_patient_id, consultation_type"
          )
          .eq("doctor_id", doctorProfile.id)
          .order("appointment_date", { ascending: false })
          .order("start_time", { ascending: false })
          .limit(10),
      ]);

      const all = [...(upcoming || []), ...(recent || [])] as any[];
      const patientUserIds = Array.from(
        new Set(all.map((a) => a.patient_id).filter(Boolean))
      ) as string[];

      const profileByUserId = new Map<
        string,
        { full_name?: string; email?: string; phone?: string; avatar_url?: string }
      >();

      if (patientUserIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, phone, avatar_url")
          .in("user_id", patientUserIds);

        (profs || []).forEach((p: any) => {
          profileByUserId.set(p.user_id, {
            full_name: p.full_name,
            email: p.email,
            phone: p.phone,
            avatar_url: p.avatar_url,
          });
        });
      }

      const format = (rows: any[]): Appointment[] =>
        (rows || []).map((a) => {
          const p = a.patient_id ? profileByUserId.get(a.patient_id) : undefined;
          return {
            id: a.id,
            doctor_id: a.doctor_id,
            appointment_date: a.appointment_date,
            start_time: a.start_time,
            end_time: a.end_time,
            status: a.status,
            notes: a.notes,
            patient_id: a.patient_id,
            doctor_patient_id: a.doctor_patient_id,
            consultation_type: a.consultation_type,
            patient_name: p?.full_name || "Patient",
            patient_email: p?.email || undefined,
            patient_phone: p?.phone || undefined,
            patient_avatar: p?.avatar_url || undefined,
          };
        });

      const formattedUpcoming = format(upcoming || []);
      const formattedRecent = format(recent || []);

      setUpcomingAppointments(formattedUpcoming);
      setRecentAppointments(formattedRecent);
      setTodaysAppointments(formattedUpcoming.filter((a) => a.appointment_date === today));
    } catch (err: any) {
      console.error("Error fetching appointments:", err);
    }
  }, [doctorProfile]);

  // Treatment plans
  const fetchTreatmentPlans = useCallback(async () => {
    if (!doctorProfile) return;
    try {
      const { data, error } = await supabase
        .from("treatment_plans")
        .select("*")
        .eq("doctor_id", doctorProfile.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTreatmentPlans((data || []) as any);
    } catch (err: any) {
      console.error("Error fetching treatment plans:", err);
    }
  }, [doctorProfile]);

  // Stats
  const calculateStats = useCallback(async () => {
    if (!doctorProfile) return;
    try {
      const { data: patients } = await supabase
        .from("appointments")
        .select("patient_id")
        .eq("doctor_id", doctorProfile.id)
        .neq("status", "canceled");

      const uniquePatients = new Set((patients || []).map((p: any) => p.patient_id).filter(Boolean));

      const { data: completed } = await supabase
        .from("appointments")
        .select("id")
        .eq("doctor_id", doctorProfile.id)
        .eq("status", "completed");

      const revenue = (completed?.length || 0) * (doctorProfile.consultation_fee || 150);
      const profileCompletion = calculateProfileCompletion(doctorProfile);

      setStats({
        totalPatients: uniquePatients.size,
        totalAppointments: doctorProfile.appointment_count || 0,
        totalRevenue: revenue,
        averageRating: doctorProfile.average_rating || 0,
        numReviews: doctorProfile.num_reviews || 0,
        profileCompletion,
      });
    } catch (err: any) {
      console.error("Error calculating stats:", err);
    }
  }, [doctorProfile]);

  // CRUD operations
  const updateProfile = async (updates: Partial<DoctorProfile>): Promise<{ success?: boolean; error?: string }> => {
    if (!doctorProfile) return { error: "No doctor profile found" };
    try {
      const { error } = await supabase.from("doctors").update(updates).eq("id", doctorProfile.id);
      if (error) throw error;
      toast.success("Profile updated successfully");
      refreshSeq.current += 1;
      return { success: true };
    } catch (err: any) {
      console.error("Error updating profile:", err);
      toast.error("Failed to update profile");
      return { error: err.message };
    }
  };

  const addService = async (
    serviceData: Omit<DoctorService, "id" | "dentist_id" | "created_at" | "updated_at">
  ): Promise<{ success?: boolean; error?: string }> => {
    if (!doctorProfile) return { error: "No doctor profile found" };
    try {
      const insertData = {
        name: serviceData.name,
        description: serviceData.description,
        category: serviceData.category as any,
        default_cost: serviceData.default_cost,
        duration_minutes: serviceData.duration_minutes,
        is_active: serviceData.is_active,
        dentist_id: doctorProfile.id,
      };
      const { error } = await supabase.from("procedures").insert(insertData);
      if (error) throw error;
      toast.success("Service added successfully");
      refreshSeq.current += 1;
      return { success: true };
    } catch (err: any) {
      console.error("Error adding service:", err);
      toast.error("Failed to add service");
      return { error: err.message };
    }
  };

  const updateService = async (id: string, updates: Partial<DoctorService>): Promise<{ success?: boolean; error?: string }> => {
    try {
      const updateData = {
        ...updates,
        category: updates.category as any,
      };
      const { error } = await supabase.from("procedures").update(updateData).eq("id", id);
      if (error) throw error;
      toast.success("Service updated successfully");
      refreshSeq.current += 1;
      return { success: true };
    } catch (err: any) {
      console.error("Error updating service:", err);
      toast.error("Failed to update service");
      return { error: err.message };
    }
  };

  const deleteService = async (id: string): Promise<{ success?: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from("procedures").update({ is_active: false }).eq("id", id);
      if (error) throw error;
      toast.success("Service deleted successfully");
      refreshSeq.current += 1;
      return { success: true };
    } catch (err: any) {
      console.error("Error deleting service:", err);
      toast.error("Failed to delete service");
      return { error: err.message };
    }
  };

  // Diagnosis CRUD (using procedure_templates table)
  const addDiagnosis = async (diagnosis: any): Promise<{ success?: boolean; error?: string }> => {
    if (!doctorProfile) return { error: "No doctor profile found" };
    try {
      const payload = {
        doctor_id: doctorProfile.id,
        name: String(diagnosis.title || "").trim(),
        code: (diagnosis.icd10_code || null) as string | null,
        description: (diagnosis.description || null) as string | null,
        category: Array.isArray(diagnosis.tags) && diagnosis.tags.length > 0 ? diagnosis.tags[0] : null,
        is_active: diagnosis.is_active ?? true,
      };
      if (!payload.name) return { error: "Title is required" };
      const { error } = await (supabase as any).from("procedure_templates").insert(payload);
      if (error) throw error;
      toast.success("Diagnosis added");
      refreshSeq.current += 1;
      return { success: true };
    } catch (err: any) {
      console.error("Error adding diagnosis:", err);
      toast.error("Failed to add diagnosis");
      return { error: err.message };
    }
  };

  const updateDiagnosis = async (id: string, updates: any): Promise<{ success?: boolean; error?: string }> => {
    try {
      const payload: any = {};
      if (updates.title != null) payload.name = String(updates.title).trim();
      if (updates.icd10_code !== undefined) payload.code = updates.icd10_code;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.tags != null) payload.category = Array.isArray(updates.tags) && updates.tags.length > 0 ? updates.tags[0] : null;
      if (updates.is_active !== undefined) payload.is_active = updates.is_active;
      
      const { error } = await (supabase as any)
        .from("procedure_templates")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
      toast.success("Diagnosis updated");
      refreshSeq.current += 1;
      return { success: true };
    } catch (err: any) {
      console.error("Error updating diagnosis:", err);
      toast.error("Failed to update diagnosis");
      return { error: err.message };
    }
  };

  const deleteDiagnosis = async (id: string): Promise<{ success?: boolean; error?: string }> => {
    try {
      const { error } = await (supabase as any)
        .from("procedure_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Diagnosis deleted");
      refreshSeq.current += 1;
      return { success: true };
    } catch (err: any) {
      console.error("Error deleting diagnosis:", err);
      toast.error("Failed to delete diagnosis");
      return { error: err.message };
    }
  };

  // Comprehensive refresh
  const refreshAllData = useCallback(async () => {
    setLoading(true);
    try {
      const p = await fetchDoctorProfile();
      if (p) {
        await Promise.all([fetchServices(), fetchAppointments(), fetchTreatmentPlans(), fetchDiagnoses(), calculateStats()]);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchAppointments, fetchDiagnoses, fetchDoctorProfile, fetchServices, fetchTreatmentPlans, calculateStats]);

  // Subscriptions (debounced)
  useEffect(() => {
    if (!doctorProfile) return;
    let debounce: any;
    const bump = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        refreshSeq.current += 1;
        // soft refresh
        Promise.all([fetchAppointments(), fetchServices(), fetchDiagnoses(), calculateStats()]).catch(() => {});
      }, 800);
    };

    const channels = [
      supabase
        .channel("doctor-profile-changes")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "doctors", filter: `id=eq.${doctorProfile.id}` },
          bump
        )
        .subscribe(),
      supabase
        .channel("doctor-services-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "procedures", filter: `dentist_id=eq.${doctorProfile.id}` },
          bump
        )
        .subscribe(),
      supabase
        .channel("doctor-appointments-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "appointments", filter: `doctor_id=eq.${doctorProfile.id}` },
          bump
        )
        .subscribe(),
      supabase
        .channel("doctor-diagnoses-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "procedure_templates", filter: `doctor_id=eq.${doctorProfile.id}` },
          bump
        )
        .subscribe(),
    ];

    return () => {
      clearTimeout(debounce);
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [doctorProfile, fetchAppointments, fetchDiagnoses, fetchServices, calculateStats]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!mounted) return;
      if (user && profile?.role === "doctor") {
        await refreshAllData();
      } else {
        setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [user, profile?.role, refreshAllData]);

  return {
    // Data
    doctorProfile,
    services,
    diagnoses,
    diagnosisLoading,
    upcomingAppointments,
    todaysAppointments,
    recentAppointments,
    treatmentPlans,
    stats,

    // State
    loading,

    // Actions
    updateProfile,
    addService,
    updateService,
    deleteService,
    addDiagnosis,
    updateDiagnosis,
    deleteDiagnosis,
    refreshAllData,

    // Computed
    isProfileComplete: stats.profileCompletion >= 80,
    hasActiveServices: services.length > 0,
    hasUpcomingAppointments: upcomingAppointments.length > 0,
    hasTodaysAppointments: todaysAppointments.length > 0,
  };
};
