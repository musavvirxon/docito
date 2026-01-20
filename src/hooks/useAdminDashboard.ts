// File: src/hooks/useAdminDashboard.ts
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveEntityScope } from "@/hooks/useActiveEntityScope";

interface DashboardStats {
  totalBookings: number;
  totalPatients: number;
  totalRevenue: number;
  clinicRating: number;
  pendingInvites: number;
  locations: number;
}

interface PerformanceMetrics {
  averageRating: number;
  patientRetention: number;
  avgWaitTime: number;
  noShowRate: number;
}

export const useAdminDashboard = () => {
  const { activeEntityId: practiceId, loading: scopeLoading } = useActiveEntityScope("clinic");

  const [practice, setPractice] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    totalPatients: 0,
    totalRevenue: 0,
    clinicRating: 0,
    pendingInvites: 0,
    locations: 0,
  });
  const [doctors, setDoctors] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    averageRating: 0,
    patientRetention: 0,
    avgWaitTime: 0,
    noShowRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPracticeData = useCallback(async () => {
    const { data: authRes } = await supabase.auth.getUser();
    const user = authRes?.user;
    if (!user) return null;

    // Prefer scoped practiceId (works for clinic_admin + clinic_staff + owner)
    if (practiceId) {
      const { data, error } = await supabase.from("practices").select("*").eq("id", practiceId).maybeSingle();
      if (error) throw error;
      setPractice(data);
      return data;
    }

    // Fallback: practice owner
    const { data: practiceData, error: practiceError } = await supabase
      .from("practices")
      .select("*")
      .eq("admin_id", user.id)
      .maybeSingle();

    if (practiceError) throw practiceError;
    setPractice(practiceData);
    return practiceData;
  }, [practiceId]);

  const fetchDashboardStats = async (practiceData: any) => {
    if (!practiceData) return;

    try {
      const { data: statsData, error: statsError } = await supabase.rpc("get_practice_stats" as any, {
        p_practice_id: practiceData.id,
      });

      if (statsError) throw statsError;

      const s = statsData as any;
      setStats({
        totalBookings: s?.total_bookings || 0,
        totalPatients: s?.total_patients || 0,
        totalRevenue: s?.total_revenue || 0,
        clinicRating: s?.clinic_rating || 0,
        pendingInvites: s?.pending_invites || 0,
        locations: s?.locations || 0,
      });
    } catch (e) {
      console.warn("Failed to fetch practice stats:", e);
    }
  };

  const fetchDoctors = async (practiceData: any) => {
    if (!practiceData) return;

    const { data, error } = await supabase
      .from("doctors")
      .select(
        `
        *,
        profiles(full_name, email)
      `,
      )
      .eq("practice_id", practiceData.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setDoctors(data || []);
  };

  const fetchAppointments = async (practiceData: any) => {
    if (!practiceData) return;

    try {
      const { data, error } = await supabase.rpc("get_practice_appointments" as any, {
        p_practice_id: practiceData.id,
        p_limit_count: 10,
      });

      if (error) throw error;
      setAppointments((data as any[]) || []);
    } catch (e) {
      console.warn("Failed to fetch appointments:", e);
    }
  };

  const fetchServices = async (practiceData: any) => {
    if (!practiceData) return;

    try {
      const { data, error } = await supabase.rpc("get_practice_services" as any, {
        p_practice_id: practiceData.id,
      });

      if (error) throw error;
      setServices((data as any[]) || []);
    } catch (e) {
      console.warn("Failed to fetch services:", e);
    }
  };

  const fetchStaff = async (practiceData: any) => {
    if (!practiceData) return;

    try {
      const { data, error } = await supabase.rpc("get_practice_staff" as any, {
        p_practice_id: practiceData.id,
      });

      if (error) throw error;
      setStaff((data as any[]) || []);
    } catch (e) {
      console.warn("Failed to fetch staff:", e);
    }
  };

  const fetchLocations = async (practiceData: any) => {
    if (!practiceData) return;

    const { data, error } = await supabase
      .from("practice_locations")
      .select("*")
      .eq("practice_id", practiceData.id)
      .order("is_primary", { ascending: false });

    if (error) throw error;
    setLocations(data || []);
  };

  const fetchPatients = async (practiceData: any) => {
    if (!practiceData) return;

    try {
      const { data, error } = await supabase.rpc("get_practice_patients" as any, {
        p_practice_id: practiceData.id,
        p_limit_count: 10,
      });

      if (error) throw error;
      setPatients((data as any[]) || []);
    } catch (e) {
      console.warn("Failed to fetch patients:", e);
    }
  };

  const fetchPayments = async (practiceData: any) => {
    if (!practiceData) return;

    try {
      const { data, error } = await supabase.rpc("get_practice_payments" as any, {
        p_practice_id: practiceData.id,
        p_limit_count: 10,
      });

      if (error) throw error;
      setPayments((data as any[]) || []);
    } catch (e) {
      console.warn("Failed to fetch payments:", e);
    }
  };

  const fetchMessages = async (practiceData: any) => {
    if (!practiceData) return;

    try {
      const { data, error } = await supabase.rpc("get_practice_messages" as any, {
        p_practice_id: practiceData.id,
        p_limit_count: 10,
      });

      if (error) throw error;
      setMessages((data as any[]) || []);
    } catch (e) {
      console.warn("Failed to fetch messages:", e);
    }
  };

  const fetchPerformanceMetrics = async () => {
    if (!practice) return;

    try {
      const now = new Date();
      const start30 = new Date(now);
      start30.setDate(start30.getDate() - 30);

      const { data: practiceRating } = await supabase
        .from("practice_ratings")
        .select("average_rating")
        .eq("practice_id", practice.id)
        .maybeSingle();

      const { data: completedRecent } = await supabase
        .from("appointments")
        .select("appointment_date,start_time,created_at,status")
        .eq("practice_id", practice.id)
        .eq("status", "completed")
        .gte("created_at", start30.toISOString())
        .lt("created_at", now.toISOString())
        .limit(20000);

      const leadMinutes = (completedRecent || [])
        .map((a: any) => {
          const created = new Date(a.created_at);
          const date = String(a.appointment_date);
          const time = String(a.start_time);
          const scheduled = new Date(`${date}T${time}Z`);
          const diff = (scheduled.getTime() - created.getTime()) / (1000 * 60);
          return Number.isFinite(diff) ? Math.max(0, diff) : 0;
        })
        .filter((n: number) => n >= 0);

      const avgLeadMinutes = leadMinutes.length
        ? Math.round(leadMinutes.reduce((s: number, v: number) => s + v, 0) / leadMinutes.length)
        : 0;

      setMetrics({
        averageRating: practiceRating?.average_rating || 0,
        patientRetention: 0,
        avgWaitTime: avgLeadMinutes,
        noShowRate: 0,
      });
    } catch (err) {
      console.error("Error fetching performance metrics:", err);
    }
  };

  const refreshData = useCallback(async () => {
    if (scopeLoading) return;

    try {
      setLoading(true);
      setError(null);

      const practiceData = await fetchPracticeData();

      if (practiceData) {
        await Promise.all([
          fetchDashboardStats(practiceData),
          fetchDoctors(practiceData),
          fetchAppointments(practiceData),
          fetchServices(practiceData),
          fetchStaff(practiceData),
          fetchLocations(practiceData),
          fetchPatients(practiceData),
          fetchPayments(practiceData),
          fetchMessages(practiceData),
        ]);
      }

      setLoading(false);
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message || "Failed to load dashboard data");
      setLoading(false);
    }
  }, [fetchPracticeData, scopeLoading]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    void fetchPerformanceMetrics();
  }, [practice]);

  return {
    practice,
    stats,
    doctors,
    appointments,
    services,
    staff,
    locations,
    patients,
    payments,
    messages,
    metrics,
    loading,
    error,
    refreshData,
  };
};
