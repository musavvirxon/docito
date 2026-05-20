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
        .order("created_at", { ascending: false })
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
      const base = data || [];

      // Hydrate from doctor_profiles_view (bio, fees, languages, experience, ratings...)
      const ids = base.map((d: any) => d.id).filter(Boolean);
      let profileById: Record<string, any> = {};
      if (ids.length) {
        const { data: profiles } = await (supabase as any)
          .from("doctor_profiles_view")
          .select("*")
          .in("id", ids);
        (profiles || []).forEach((p: any) => { profileById[p.id] = p; });
      }

      // Per-doctor schedule_settings & procedures (best effort)
      const [schedRes, procRes] = await Promise.all([
        ids.length
          ? (supabase as any).from("schedule_settings").select("*").in("doctor_id", ids)
          : Promise.resolve({ data: [] }),
        ids.length
          ? (supabase as any).from("procedures").select("*").in("doctor_id", ids)
          : Promise.resolve({ data: [] }),
      ]);
      const schedByDoctor: Record<string, any> = {};
      (schedRes?.data || []).forEach((r: any) => {
        if (r.doctor_id) schedByDoctor[r.doctor_id] = r;
      });
      const procByDoctor: Record<string, any[]> = {};
      (procRes?.data || []).forEach((r: any) => {
        const k = r.doctor_id; if (!k) return;
        (procByDoctor[k] = procByDoctor[k] || []).push(r);
      });

      const merged = base.map((d: any) => {
        const p = profileById[d.id] || {};
        const s = schedByDoctor[d.id] || null;
        return {
          ...d,
          name: d.full_name || p.full_name || d.name,
          full_name: d.full_name || p.full_name,
          specialty: d.specialty || p.specialty,
          bio: d.bio || p.bio,
          email: d.email || p.email,
          phone: d.phone || p.phone,
          languages: d.languages || p.languages || [],
          years_experience: d.years_experience ?? p.years_experience ?? null,
          consultation_fee: d.consultation_fee ?? p.consultation_fee ?? null,
          consultation_types: d.consultation_types || p.consultation_types || [],
          license_number: d.license_number || p.license_number,
          avatar_url: d.avatar_url || p.avatar_url,
          accepts_new_patients: d.accepts_new_patients ?? p.accepts_new_patients ?? null,
          verified: d.is_verified ?? p.verified ?? null,
          rating: d.rating ?? p.average_rating ?? null,
          num_reviews: p.num_reviews ?? 0,
          custom_profile_link: p.custom_profile_link,
          username: p.username,
          schedule: s
            ? { working_days: s.working_days || {}, buffer_time: s.buffer_time, holidays: s.holidays || [] }
            : null,
          procedures: procByDoctor[d.id] || [],
          status: d.status || (p.verified ? "active" : "pending"),
          source: 'doctor',
        };
      });

      // Append pending doctor invitations so manually-invited providers are visible
      try {
        const { data: invites } = await (supabase as any)
          .from("staff_invitations")
          .select("id, email, full_name, status, role, created_at")
          .eq("entity_type", "practice")
          .eq("entity_id", practiceData.id)
          .eq("role", "doctor")
          .in("status", ["pending", "sent"]);
        (invites || []).forEach((inv: any) => {
          merged.push({
            id: `invite-${inv.id}`,
            name: inv.full_name || inv.email,
            full_name: inv.full_name,
            email: inv.email,
            specialty: '—',
            status: 'invited',
            source: 'invitation',
            created_at: inv.created_at,
            invitation_id: inv.id,
            schedule: null,
            procedures: [],
          });
        });
      } catch { /* ignore */ }

      setDoctors(merged);
    } catch { setDoctors([]); }
  }, []);

  const fetchAppointments = useCallback(async (practiceData: any) => {
    if (!practiceData?.id) return;
    try {
      const { data, error } = await supabase.rpc("get_practice_appointments" as any, {
        p_practice_id: practiceData.id,
        p_limit_count: 5000,
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
      // 1. Registered patients (via RPC: completed appointments)
      const { data: rpcData } = await supabase.rpc("get_practice_patients" as any, {
        p_practice_id: practiceData.id,
        p_limit_count: 500,
      });

      // 2. Facility patients (manually added at the practice)
      const { data: facilityData } = await (supabase as any)
        .from("facility_patients")
        .select("*")
        .eq("facility_id", practiceData.id)
        .order("created_at", { ascending: false });

      // 3. Doctor patients for any doctor in this practice
      const { data: practiceDocs } = await supabase
        .from("doctors")
        .select("id, user_id")
        .eq("practice_id", practiceData.id);
      const docIds = (practiceDocs || []).map((d: any) => d.id).filter(Boolean);
      let doctorPatientsData: any[] = [];
      if (docIds.length) {
        const { data: dp } = await (supabase as any)
          .from("doctor_patients")
          .select("*")
          .in("doctor_id", docIds)
          .order("created_at", { ascending: false });
        doctorPatientsData = dp || [];
      }

      // 4. Patient names referenced only in appointments (snapshot patient_id list)
      const { data: aptRows } = await supabase
        .from("appointments")
        .select("patient_id, doctor_patient_id, status, appointment_date")
        .eq("practice_id", practiceData.id)
        .order("appointment_date", { ascending: false })
        .limit(5000);

      // 5. Per-patient financial totals
      const { data: txRows } = await (supabase as any)
        .from("billing_transactions")
        .select("user_id, amount, status")
        .eq("practice_id", practiceData.id)
        .limit(10000);
      const totalsByUser = new Map<string, { paid: number; outstanding: number }>();
      (txRows || []).forEach((t: any) => {
        if (!t.user_id) return;
        const cur = totalsByUser.get(t.user_id) || { paid: 0, outstanding: 0 };
        const amt = Number(t.amount || 0);
        if (String(t.status).toLowerCase() === "paid" || String(t.status).toLowerCase() === "succeeded") cur.paid += amt;
        else cur.outstanding += amt;
        totalsByUser.set(t.user_id, cur);
      });

      const merged: any[] = [];
      const seen = new Set<string>();
      const push = (p: any) => {
        const key = p.id || p.user_id || p.email || `${p.full_name}-${p.phone || ''}`;
        if (!key || seen.has(key)) return;
        seen.add(key);
        const fin = (p.user_id && totalsByUser.get(p.user_id)) || { paid: 0, outstanding: 0 };
        merged.push({ ...p, total_paid: fin.paid, total_outstanding: fin.outstanding });
      };

      ((rpcData as any[]) || []).forEach((p) => push({ ...p, source: 'registered' }));
      (facilityData || []).forEach((p: any) => push({
        ...p,
        name: p.full_name,
        source: 'facility',
        status: p.status || 'active',
      }));
      doctorPatientsData.forEach((p: any) => push({
        ...p,
        name: p.full_name,
        source: 'doctor',
        status: p.status || 'active',
      }));

      // Mark appointment-only patient_ids that aren't in the merged list
      const knownIds = new Set(merged.map((m) => m.id).filter(Boolean));
      const aptPatientIds = new Set(((aptRows || []) as any[]).map((a) => a.patient_id).filter(Boolean));
      aptPatientIds.forEach((pid) => {
        if (!knownIds.has(pid)) {
          push({ id: pid, full_name: 'Patient', source: 'appointments-only', status: 'active' });
        }
      });

      setPatients(merged);
    } catch (e) {
      console.error('fetchPatients failed', e);
      setPatients([]);
    }
  }, []);

  const fetchPayments = useCallback(async (practiceData: any) => {
    if (!practiceData?.id) return;
    try {
      // 1) Practice-scoped billing transactions
      const { data: btData } = await (supabase as any)
        .from("billing_transactions")
        .select("id, user_id, amount, amount_cents, status, description, created_at, appointment_id, provider")
        .eq("practice_id", practiceData.id)
        .order("created_at", { ascending: false })
        .limit(500);

      // 2) Practice-scoped payments table (cash / clinic-recorded payments)
      const { data: practiceDocs } = await supabase
        .from("doctors")
        .select("id")
        .eq("practice_id", practiceData.id);
      const docIds = (practiceDocs || []).map((d: any) => d.id).filter(Boolean);

      let payRows: any[] = [];
      try {
        const direct = await (supabase as any)
          .from("payments")
          .select("id, patient_id, doctor_id, practice_id, appointment_id, amount, status, payment_method, transaction_id, paid_at, created_at, notes")
          .eq("practice_id", practiceData.id)
          .order("created_at", { ascending: false })
          .limit(500);
        if (Array.isArray(direct?.data)) payRows = payRows.concat(direct.data);
      } catch { /* ignore */ }
      if (docIds.length) {
        try {
          const byDoc = await (supabase as any)
            .from("payments")
            .select("id, patient_id, doctor_id, practice_id, appointment_id, amount, status, payment_method, transaction_id, paid_at, created_at, notes")
            .in("doctor_id", docIds)
            .order("created_at", { ascending: false })
            .limit(500);
          if (Array.isArray(byDoc?.data)) payRows = payRows.concat(byDoc.data);
        } catch { /* ignore */ }
      }
      // Dedupe payments by id
      const seenPay = new Set<string>();
      payRows = payRows.filter((p: any) => {
        if (!p?.id || seenPay.has(p.id)) return false;
        seenPay.add(p.id);
        return true;
      });

      const allUserIds = Array.from(new Set([
        ...(((btData as any[]) || []).map((d: any) => d.user_id).filter(Boolean)),
        ...payRows.map((d: any) => d.patient_id).filter(Boolean),
      ]));
      let nameByUser: Record<string, string> = {};
      if (allUserIds.length) {
        const { data: profs } = await (supabase as any)
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", allUserIds);
        (profs || []).forEach((p: any) => { nameByUser[p.user_id] = p.full_name; });
      }

      const btEnriched = ((btData as any[]) || []).map((t: any) => ({
        ...t,
        source: 'billing_transactions',
        patient_name: (t.user_id && nameByUser[t.user_id]) || 'Walk-in / Offline patient',
      }));
      const payEnriched = payRows.map((t: any) => ({
        ...t,
        user_id: t.patient_id,
        amount_cents: Math.round(Number(t.amount || 0) * 100),
        provider: t.payment_method,
        source: 'payments',
        patient_name: (t.patient_id && nameByUser[t.patient_id]) || 'Walk-in / Offline patient',
      }));

      setPayments([...btEnriched, ...payEnriched]);
    } catch (e) {
      console.error('fetchPayments failed', e);
      setPayments([]);
    }
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
