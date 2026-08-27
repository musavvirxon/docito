// File: src/hooks/useMyDoctorFinance.ts
//
// Read-only finance snapshot for the signed-in doctor: their active room rent
// obligation, their active commission profile and their settlement history.
// Every query is filtered to the current user; RLS self-view policies back it up.

import { useCallback, useEffect, useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import type { DoctorRentProfileRow } from "@/hooks/useDoctorRentProfiles";
import type { CompensationProfileRow } from "@/hooks/useCompensationProfiles";

export type MySettlementRecord = {
  id: string;
  entity_type: string;
  entity_id: string;
  period_start: string;
  period_end: string;
  commission_owed_cents: number;
  rent_owed_cents: number;
  net_cents: number;
  status: string;
  settled_at: string | null;
};

export function useMyDoctorFinance(userId?: string | null) {
  const [rentProfiles, setRentProfiles] = useState<DoctorRentProfileRow[]>([]);
  const [compProfiles, setCompProfiles] = useState<CompensationProfileRow[]>([]);
  const [settlements, setSettlements] = useState<MySettlementRecord[]>([]);
  const [roomLabel, setRoomLabel] = useState<string | null>(null);
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [rentRes, compRes, settleRes, docRes] = await Promise.all([
        supabase
          .from("doctor_room_rent_profiles")
          .select("*")
          .eq("user_id", userId)
          .order("is_active", { ascending: false })
          .order("effective_from", { ascending: false }),
        supabase
          .from("staff_compensation_profiles")
          .select("*")
          .eq("user_id", userId)
          .order("is_active", { ascending: false })
          .order("effective_from", { ascending: false }),
        supabase
          .from("doctor_settlement_records")
          .select("*")
          .eq("user_id", userId)
          .order("period_start", { ascending: false })
          .limit(60),
        supabase.from("doctors").select("id, practice_id").eq("user_id", userId).maybeSingle(),
      ]);

      const rents = ((rentRes.data || []) as any) as DoctorRentProfileRow[];
      setRentProfiles(rents);
      setCompProfiles(((compRes.data || []) as any) as CompensationProfileRow[]);
      setSettlements(((settleRes.data || []) as any) as MySettlementRecord[]);
      setPracticeId((docRes.data as any)?.practice_id ?? null);

      const activeRoomId = rents.find((r) => r.is_active)?.room_id;
      if (activeRoomId) {
        const { data: room } = await supabase
          .from("clinic_rooms")
          .select("name, room_number")
          .eq("id", activeRoomId)
          .maybeSingle();
        setRoomLabel(
          room ? [room.name, room.room_number].filter(Boolean).join(" · ") || null : null,
        );
      } else {
        setRoomLabel(null);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeRent = rentProfiles.find((r) => r.is_active) || null;
  const activeCommission =
    compProfiles.find((c) => c.is_active && c.compensation_type === "percentage") || null;

  // Entity scope used when the doctor logs a payment.
  const scope =
    activeRent
      ? { entityType: activeRent.entity_type, entityId: activeRent.entity_id }
      : activeCommission
        ? { entityType: activeCommission.entity_type, entityId: activeCommission.entity_id }
        : practiceId
          ? ({ entityType: "practice", entityId: practiceId } as const)
          : null;

  return {
    loading,
    rentProfiles,
    compProfiles,
    settlements,
    activeRent,
    activeCommission,
    roomLabel,
    scope: scope as { entityType: any; entityId: string } | null,
    refresh: load,
  };
}
