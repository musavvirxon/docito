// File: src/hooks/useDoctorProcedureSettings.ts
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DoctorProcedureSettingsDoctor = {
  id: string;
  verified: boolean;
  consultation_fee: number | null;
  accepts_new_patients: boolean | null;
};

export type DoctorProcedureSettingsProcedure = {
  id: string;
  dentist_id: string;
  name: string;
  price: number | null;
  default_cost: number | null;
  duration_minutes: number | null;
  is_active: boolean | null;
  is_bookable: boolean | null;
  is_consultation: boolean | null;
};

type GetResponse = {
  ok: boolean;
  error?: string;
  doctor?: DoctorProcedureSettingsDoctor;
  consultationProcedure?: DoctorProcedureSettingsProcedure | null;
};

type SaveArgs = {
  consultation_fee?: number | null;
  accepts_new_patients?: boolean | null;
  consultation_duration_minutes?: number | null;
  consultation_is_active?: boolean | null;
  consultation_is_bookable?: boolean | null;
};

export function useDoctorProcedureSettings() {
  const [doctor, setDoctor] = useState<DoctorProcedureSettingsDoctor | null>(null);
  const [consultationProcedure, setConsultationProcedure] = useState<DoctorProcedureSettingsProcedure | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invoke = useCallback(async (body: Record<string, unknown>) => {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) throw sessionErr;

    const token = sessionData?.session?.access_token;
    if (!token) throw new Error("Not authenticated");

    const { data, error: fnError } = await supabase.functions.invoke("doctor-procedures-settings", {
      body,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (fnError) throw fnError;
    return data as GetResponse;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await invoke({ action: "get" });
      if (!res?.ok) throw new Error(res?.error || "Failed to load settings");
      setDoctor(res.doctor ?? null);
      setConsultationProcedure(res.consultationProcedure ?? null);
    } catch (e: any) {
      setDoctor(null);
      setConsultationProcedure(null);
      setError(e?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  const save = useCallback(
    async (args: SaveArgs) => {
      setSaving(true);
      setError(null);
      try {
        const res = await invoke({ action: "save", ...args });
        if (!res?.ok) throw new Error(res?.error || "Failed to save settings");
        setDoctor(res.doctor ?? null);
        setConsultationProcedure(res.consultationProcedure ?? null);
        return res;
      } catch (e: any) {
        setError(e?.message || "Failed to save settings");
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [invoke],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    doctor,
    consultationProcedure,
    loading,
    saving,
    error,
    refresh,
    save,
  };
}
