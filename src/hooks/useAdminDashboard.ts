// PATH: src/hooks/useAdminDashboard.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user, bootstrapped } = useAuth();
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
  const didLoad = useRef(false);

  const resolvePracticeForUser = useCallback(async (uid: string) => {
    // 1) Owner/admin practice
    {
      const { data, error } = await supabase
        .from("practices")
        .select("*")
        .eq("admin_id", uid)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data?.id) return data;
    }

    // 2) clinic_staff table
    {
      const { data: clinicStaffRow, error: csErr } = await supabase
        .from("clinic_staff")
        .select("practice_id,status")
        .eq("user_id", uid)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!csErr && clinicStaffRow?.practice_id) {
        const { data: p1, error: p1Err } = await supabase
          .from("practices")
          .select("*")
          .eq("id", clinicStaffRow.practice_id)
          .maybeSingle();
        if (!p1Err && p1?.id) return p1;
      }
    }

    // 3) practice_staff table (legacy fallback)
    try {
      const { data: staffRow } = await supabase
        .from("practice_staff")
        .select("practice_id,status")
        .eq("user_id", uid)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const practiceId = (staffRow as any)?.practice_id;
      if (!practiceId) return null;

      const { data: p2 } = await supabase.from("practices").select("*").eq("id", practiceId).maybeSingle();
      return p2 ?? null;
    } catch {
      return null;
    }
  }, []);

  // --- Individual fetch functions (all graceful) ---

  const fetchDashboardStats = useCallback(async (practiceData: any) => {
    if (!practiceData?.id) return;
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
    } catch { /* keep defaults */ }
  }, []);

  const fetchDoctors = useCallback(async (practiceData: any) => {
    if (!practiceData?.id) return;
    try {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .eq("practice_id", practiceData.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDoctors(data || []);
    } catch { setDoctors([]); }
  }, []);

  const fetchAppointments = useCallback(async (practiceData: any) => {
    if (!practiceData?.id) return;
    try {
      const { data, error } = await supabase.rpc("get_practice_appointments" as any, {
        p_practice_id: practiceData.id,
        p_limit_count: 10,
      });
      if (error) throw error;
      setAppointments((data as any[]) || []);
    } catch { setAppointments([]); }
  }, []);

  const fetchServices = useCallback(async (practiceData: any) => {
    if (!practiceData?.id) return;
    try {
      const { data, error } = await supabase.rpc("get_practice_services" as any, { p_practice_id: practiceData.id });
      if (error) throw error;
      setServices((data as any[]) || []);
    } catch { setServices([]); }
  }, []);

  const fetchStaff = useCallback(async (practiceData: any) => {
    if (!practiceData?.id) return;
    try {
      const { data, error } = await supabase.rpc("get_practice_staff" as any, { p_practice_id: practiceData.id });
      if (error) throw error;
      setStaff((data as any[]) || []);
    } catch { setStaff([]); }
  }, []);

  const fetchLocations = useCallback(async (practiceData: any) => {
    if (!practiceData?.id) return;
    try {
      const { data, error } = await supabase
        .from("practice_locations")
        .select("*")
        .eq("practice_id", practiceData.id)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      setLocations(data || []);
    } catch { setLocations([]); }
  }, []);

  const fetchPatients = useCallback(async (practiceData: any) => {
    if (!practiceData?.id) return;
    try {
      const { data, error } = await supabase.rpc("get_practice_patients" as any, {
        p_practice_id: practiceData.id,
        p_limit_count: 20,
      });
      if (error) throw error;
      setPatients((data as any[]) || []);
    } catch { setPatients([]); }
  }, []);

  const fetchPayments = useCallback(async (practiceData: any) => {
    if (!practiceData?.id) return;
    try {
      const { data, error } = await supabase.rpc("get_practice_payments" as any, {
        p_practice_id: practiceData.id,
        p_limit_count: 10,
      });
      if (error) throw error;
      setPayments((data as any[]) || []);
    } catch { setPayments([]); }
  }, []);

  const fetchMessages = useCallback(async (practiceData: any) => {
    if (!practiceData?.id) return;
    try {
      const { data, error } = await supabase.rpc("get_practice_messages" as any, {
        p_practice_id: practiceData.id,
        p_limit_count: 5,
      });
      if (error) throw error;
      setMessages((data as any[]) || []);
    } catch { setMessages([]); }
  }, []);

  const fetchPerformanceMetrics = useCallback(async (practiceData: any) => {
    if (!practiceData?.id) return;
    try {
      const { data: practiceRating } = await supabase
        .from("practices")
        .select("average_rating")
        .eq("id", practiceData.id)
        .maybeSingle();

      const now = new Date();
      const start180 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

      const { data: completedVisits, error: cvErr } = await supabase
        .from("appointments")
        .select("patient_id")
        .eq("practice_id", practiceData.id)
        .eq("status", "completed")
        .gte("appointment_date", start180.toISOString().slice(0, 10))
        .limit(20000);

      if (cvErr) throw cvErr;

      const visitCounts = new Map<string, number>();
      (completedVisits || []).forEach((r: any) => {
        if (!r.patient_id) return;
        visitCounts.set(r.patient_id, (visitCounts.get(r.patient_id) || 0) + 1);
      });

      const totalCompletedPatients = visitCounts.size;
      const retained = Array.from(visitCounts.values()).filter((n) => n >= 2).length;
      const retentionPct = totalCompletedPatients > 0 ? Math.round((retained / totalCompletedPatients) * 100) : 0;

      const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const { data: last30, error: last30Err } = await supabase
        .from("appointments")
        .select("status")
        .eq("practice_id", practiceData.id)
        .gte("appointment_date", start30.toISOString().slice(0, 10))
        .limit(20000);

      if (last30Err) throw last30Err;

      const total = (last30 || []).length;
      const bad = (last30 || []).filter((a: any) => ["no_show", "canceled"].includes(String(a.status || "").toLowerCase())).length;
      const noShowRate = total > 0 ? Math.round((bad / total) * 100) : 0;

      setMetrics({
        averageRating: Number((practiceRating as any)?.average_rating || 0),
        patientRetention: retentionPct,
        avgWaitTime: 0,
        noShowRate,
      });
    } catch {
      setMetrics({ averageRating: 0, patientRetention: 0, avgWaitTime: 0, noShowRate: 0 });
    }
  }, []);

  const refreshData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const practiceData = await resolvePracticeForUser(user.id);
      setPractice(practiceData);

      if (practiceData?.id) {
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
          fetchPerformanceMetrics(practiceData),
        ]);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [
    user?.id,
    fetchAppointments,
    fetchDashboardStats,
    fetchDoctors,
    fetchLocations,
    fetchMessages,
    fetchPatients,
    fetchPayments,
    fetchPerformanceMetrics,
    fetchServices,
    fetchStaff,
    resolvePracticeForUser,
  ]);

  useEffect(() => {
    // Only run once auth is bootstrapped and user is known
    if (!bootstrapped) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }
    // Avoid double-fetching on strict mode re-renders
    if (didLoad.current) return;
    didLoad.current = true;
    refreshData();
  }, [bootstrapped, user?.id, refreshData]);

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
