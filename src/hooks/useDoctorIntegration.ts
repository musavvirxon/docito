// File: src/hooks/useDoctorIntegration.ts
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface DoctorProfile {
  id: string;
  user_id: string;
  specialty: string;
  bio: string | null;
  consultation_fee: number | null;
  years_experience: number | null;
  languages: string[] | null;
  verified: boolean;
  practice_id: string | null;
  custom_profile_link: string | null;
  consultation_types: string[] | null;
  accepts_new_patients: boolean | null;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    phone: string | null;
    username: string | null;
    profile_visibility: "public" | "private" | null;
  };
  practices?: {
    name: string;
    address: string | null;
    phone: string | null;
    city: string | null;
    country: string | null;
  } | null;
}

export interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  consultation_type?: string | null;
  notes?: string | null;
  created_at?: string;
  patient_id: string;
  profiles?: {
    full_name: string;
    avatar_url?: string | null;
  } | null;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DoctorStats {
  totalPatients: number;
  totalAppointments: number;
  totalRevenue: number;
  averageRating: number;
}

export interface TreatmentPlan {
  id: string;
  name: string;
  description: string | null;
  estimated_duration_days: number | null;
  total_cost: number | null;
  created_at: string;
  visits: any[];
}

export const useDoctorIntegration = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [stats, setStats] = useState<DoctorStats>({
    totalPatients: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    averageRating: 0,
  });

  // NOTE: keep this "loading" fast – only blocks on doctor profile fetch.
  const [loading, setLoading] = useState(true);

  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [profileCompletion, setProfileCompletion] = useState(0);

  const latestLoadId = useRef(0);

  const calculateProfileCompletion = useCallback((doc: DoctorProfile | null) => {
    if (!doc) return 0;

    const fields = [
      doc.specialty,
      doc.bio,
      doc.consultation_fee,
      doc.years_experience,
      doc.languages?.length,
      doc.profiles?.avatar_url,
      doc.profiles?.phone,
    ];

    const completed = fields.filter((f) => {
      if (Array.isArray(f)) return f.length > 0;
      return f !== null && f !== undefined && f !== "";
    }).length;

    return Math.round((completed / fields.length) * 100);
  }, []);

  const fetchDoctorProfile = useCallback(async (): Promise<DoctorProfile | null> => {
    if (!user) return null;

    try {
      const { data: doctorData, error } = await supabase
        .from("doctors")
        .select(
          `
          id,
          user_id,
          specialty,
          bio,
          consultation_fee,
          years_experience,
          languages,
          verified,
          practice_id,
          custom_profile_link,
          consultation_types,
          accepts_new_patients,
          profiles:user_id (full_name, email, avatar_url, phone, username, profile_visibility),
          practices:practice_id (name, address, phone, city, country)
        `,
        )
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      const doc = doctorData as unknown as DoctorProfile;
      setDoctorProfile(doc);
      setProfileCompletion(calculateProfileCompletion(doc));
      return doc;
    } catch (error) {
      console.error("Error fetching doctor profile:", error);
      toast({
        title: "Error",
        description: "Failed to load doctor profile",
        variant: "destructive",
      });
      return null;
    }
  }, [user, toast, calculateProfileCompletion]);

  const fetchDashboardSnapshot = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("doctor-dashboard", {
        body: {},
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to load dashboard");

      const up = (data.upcoming_appointments || []) as Appointment[];
      const rec = (data.recent_appointments || []) as Appointment[];
      setUpcomingAppointments(up);
      setRecentAppointments(rec);

      const totalPatients = Number(data?.stats?.total_patients ?? 0);
      const completedAppointments = Number(data?.stats?.completed_appointments ?? 0);

      setStats((prev) => ({
        ...prev,
        totalPatients,
        totalAppointments: completedAppointments,
      }));

      // Keep the legacy combined list used by some components
      setAppointments([...up, ...rec]);
    } catch (error) {
      console.error("Error fetching doctor dashboard snapshot:", error);
      // Do not toast here (avoid noisy), dashboard will still render and other data may load.
    }
  }, []);

  const fetchServices = useCallback(async (doctorId: string) => {
    try {
      const { data, error } = await (supabase
        .from("procedures" as any)
        .select("id, name, description, price, duration_minutes, category, is_active, created_at")
        .eq("dentist_id", doctorId)
        .order("created_at", { ascending: false })
        .limit(200) as any);

      if (error) throw error;
      setServices((data || []) as Service[]);
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  }, []);

  const fetchTreatmentPlans = useCallback(async (doctorId: string) => {
    try {
      const { data, error } = await (supabase
        .from("treatment_plans" as any)
        .select(
          `
            id,
            name,
            description,
            estimated_duration_days,
            total_cost,
            created_at,
            visits:treatment_plan_visits (*)
          `,
        )
        .eq("doctor_id", doctorId)
        .order("created_at", { ascending: false }) as any);

      if (error) throw error;
      setTreatmentPlans((data || []) as TreatmentPlan[]);
    } catch (error) {
      console.error("Error fetching treatment plans:", error);
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadId = ++latestLoadId.current;
    setLoading(true);

    // 1) Doctor profile is required to render the dashboard
    const doc = await fetchDoctorProfile();

    if (loadId !== latestLoadId.current) return;

    setLoading(false);

    // 2) Snapshot is a single fast call for appointments + core stats
    void fetchDashboardSnapshot();

    // 3) Non-blocking background loads
    if (doc?.id) {
      void Promise.allSettled([fetchServices(doc.id), fetchTreatmentPlans(doc.id)]);
    }
  }, [user, fetchDoctorProfile, fetchDashboardSnapshot, fetchServices, fetchTreatmentPlans]);

  // Real-time updates (keep light: only appointments table)
  useEffect(() => {
    if (!doctorProfile?.id) return;

    const channel = supabase
      .channel("doctor_dashboard_appointments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `doctor_id=eq.${doctorProfile.id}`,
        },
        () => {
          // refresh snapshot on appointment changes
          void fetchDashboardSnapshot();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorProfile?.id, fetchDashboardSnapshot]);

  useEffect(() => {
    if (user && profile?.role === "doctor") {
      void refreshAllData();
    } else {
      setLoading(false);
    }
  }, [user, profile?.role, refreshAllData]);

  return {
    doctorProfile,
    appointments,
    services,
    treatmentPlans,
    stats,
    loading,
    upcomingAppointments,
    recentAppointments,
    profileCompletion,
    refreshAllData,
  };
};
