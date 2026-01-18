// File: src/hooks/useStaffDashboard.ts

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useActiveEntityScope } from "@/hooks/useActiveEntityScope";

export interface StaffPermissions {
  practice_id: string | null;
  staff_role: string | null;
  can_book_appointments: boolean;
  can_view_medical_records: boolean;
  can_manage_billing: boolean;
  can_manage_patients: boolean;
  can_view_schedule: boolean;
  status: string;
}

export interface StaffAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  patient_name: string;
  patient_email?: string;
  patient_phone?: string;
  doctor_name: string;
  doctor_id: string;
}

export interface StaffPatient {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  last_visit?: string;
  status: string;
}

export interface StaffPayment {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  payment_type: string;
  patient_name: string;
  created_at: string;
  paid_at?: string;
}

export interface PracticeInfo {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
}

type PermRecord = Record<string, unknown> | null | undefined;

const bool = (p: PermRecord, k: string, fallback = false) => {
  const v = p?.[k];
  return typeof v === "boolean" ? v : fallback;
};

export const useStaffDashboard = () => {
  const { user } = useAuth();
  const { activeScope, activeEntityId: practiceId, loading: scopeLoading } = useActiveEntityScope("clinic");

  const [permissions, setPermissions] = useState<StaffPermissions | null>(null);
  const [practice, setPractice] = useState<PracticeInfo | null>(null);
  const [todaysAppointments, setTodaysAppointments] = useState<StaffAppointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<StaffAppointment[]>([]);
  const [recentPatients, setRecentPatients] = useState<StaffPatient[]>([]);
  const [recentPayments, setRecentPayments] = useState<StaffPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedPermissions = useMemo<StaffPermissions | null>(() => {
    if (!user) return null;
    if (!practiceId) return null;

    const isAdmin = Boolean(activeScope?.is_admin);
    const role = (activeScope?.scope_role as string | null) ?? (isAdmin ? "admin" : null);
    const p = activeScope?.permissions as PermRecord;

    return {
      practice_id: practiceId,
      staff_role: role,
      can_book_appointments: isAdmin ? true : bool(p, "can_book_appointments"),
      can_view_medical_records: isAdmin ? true : bool(p, "can_view_medical_records"),
      can_manage_billing: isAdmin ? true : bool(p, "can_manage_billing"),
      can_manage_patients: isAdmin ? true : bool(p, "can_manage_patients"),
      can_view_schedule: isAdmin ? true : bool(p, "can_view_schedule", true),
      status: "active",
    };
  }, [activeScope?.is_admin, activeScope?.permissions, activeScope?.scope_role, practiceId, user]);

  const fetchPractice = useCallback(async (pid: string) => {
    try {
      const { data, error } = await supabase
        .from("practices")
        .select("id, name, phone, email, address, city, country")
        .eq("id", pid)
        .single();

      if (error) throw error;
      return data as PracticeInfo;
    } catch (err: any) {
      console.error("Error fetching practice:", err);
      return null;
    }
  }, []);

  const fetchTodaysAppointments = useCallback(async (pid: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          notes,
          patient_id,
          doctor_id,
          profiles!appointments_patient_id_fkey (
            full_name,
            email,
            phone
          ),
          doctors!inner (
            id,
            profiles:user_id (
              full_name
            )
          )
        `,
        )
        .eq("practice_id", pid)
        .eq("appointment_date", today)
        .order("start_time", { ascending: true });

      if (error) throw error;

      return (data || []).map((apt: any) => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        start_time: apt.start_time,
        end_time: apt.end_time,
        status: apt.status,
        notes: apt.notes,
        patient_name: apt.profiles?.full_name || "Unknown",
        patient_email: apt.profiles?.email,
        patient_phone: apt.profiles?.phone,
        doctor_name: apt.doctors?.profiles?.full_name || "Unknown",
        doctor_id: apt.doctor_id,
      })) as StaffAppointment[];
    } catch (err: any) {
      console.error("Error fetching today's appointments:", err);
      return [];
    }
  }, []);

  const fetchUpcomingAppointments = useCallback(async (pid: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          notes,
          patient_id,
          doctor_id,
          profiles!appointments_patient_id_fkey (
            full_name,
            email,
            phone
          ),
          doctors!inner (
            id,
            profiles:user_id (
              full_name
            )
          )
        `,
        )
        .eq("practice_id", pid)
        .gt("appointment_date", today)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(20);

      if (error) throw error;

      return (data || []).map((apt: any) => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        start_time: apt.start_time,
        end_time: apt.end_time,
        status: apt.status,
        notes: apt.notes,
        patient_name: apt.profiles?.full_name || "Unknown",
        patient_email: apt.profiles?.email,
        patient_phone: apt.profiles?.phone,
        doctor_name: apt.doctors?.profiles?.full_name || "Unknown",
        doctor_id: apt.doctor_id,
      })) as StaffAppointment[];
    } catch (err: any) {
      console.error("Error fetching upcoming appointments:", err);
      return [];
    }
  }, []);

  const fetchRecentPatients = useCallback(async (pid: string) => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          patient_id,
          appointment_date,
          profiles!appointments_patient_id_fkey (
            user_id,
            full_name,
            email,
            phone
          )
        `,
        )
        .eq("practice_id", pid)
        .order("appointment_date", { ascending: false })
        .limit(20);

      if (error) throw error;

      const map = new Map<string, StaffPatient>();
      for (const row of data || []) {
        const p = (row as any).profiles;
        const userId = p?.user_id ?? (row as any).patient_id;
        if (!userId) continue;

        if (!map.has(userId)) {
          map.set(userId, {
            id: userId,
            full_name: p?.full_name || "Unknown",
            email: p?.email,
            phone: p?.phone,
            last_visit: (row as any).appointment_date,
            status: "active",
          });
        }
      }

      return Array.from(map.values());
    } catch (err: any) {
      console.error("Error fetching recent patients:", err);
      return [];
    }
  }, []);

  const fetchRecentPayments = useCallback(async (pid: string) => {
    try {
      // Use Edge Function (service-role read + explicit authz) to avoid RLS pitfalls.
      const { data, error } = await supabase.functions.invoke<
        {
          ok: boolean;
          error?: string;
          transactions?: Array<{
            id: string;
            amount_cents: number;
            currency: string;
            status: string;
            transaction_type: string;
            created_at: string;
            metadata: Record<string, any>;
          }>;
        }
      >("clinic-billing", {
        body: { clinicId: pid, limit: 10 },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to load billing");

      return (data.transactions || []).map((t) => ({
        id: t.id,
        amount_cents: Number(t.amount_cents || 0),
        currency: t.currency || "usd",
        status: t.status,
        payment_type: t.transaction_type,
        patient_name: (t.metadata?.patient_name as string) || "",
        created_at: t.created_at,
        paid_at: (t.metadata?.paid_at as string) || undefined,
      })) as StaffPayment[];
    } catch (err: any) {
      console.error("Error fetching recent payments:", err);
      return [];
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    if (!practiceId) {
      setPermissions(null);
      setPractice(null);
      setTodaysAppointments([]);
      setUpcomingAppointments([]);
      setRecentPatients([]);
      setRecentPayments([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setPermissions(resolvedPermissions);

      const [p, todayApts, upcomingApts, patients, payments] = await Promise.all([
        fetchPractice(practiceId),
        fetchTodaysAppointments(practiceId),
        fetchUpcomingAppointments(practiceId),
        fetchRecentPatients(practiceId),
        fetchRecentPayments(practiceId),
      ]);

      setPractice(p);
      setTodaysAppointments(todayApts);
      setUpcomingAppointments(upcomingApts);
      setRecentPatients(patients);
      setRecentPayments(payments);
    } catch (e: any) {
      setError(e?.message || "Failed to load staff dashboard");
    } finally {
      setLoading(false);
    }
  }, [
    fetchPractice,
    fetchRecentPatients,
    fetchRecentPayments,
    fetchTodaysAppointments,
    fetchUpcomingAppointments,
    practiceId,
    resolvedPermissions,
    user,
  ]);

  useEffect(() => {
    if (scopeLoading) return;
    refresh();
  }, [refresh, scopeLoading]);

  return {
    permissions,
    practice,
    todaysAppointments,
    upcomingAppointments,
    recentPatients,
    recentPayments,
    loading,
    error,
    refresh,
  };
};
