// Path: src/lib/facilityVerificationApi.ts
import { supabase } from "@/integrations/supabase/client";

export type FacilityEntityType = "practice" | "clinic" | "lab" | "imaging" | "pharmacy";

type ApplyTimezoneLockResponse =
  | {
      ok: true;
      entityType: FacilityEntityType;
      entityId: string;
      appliedTimezone: string;
      timezoneSource: "verification";
      timezoneLocked: true;
    }
  | { ok: false; error: string; code?: string };

export async function applyFacilityVerificationTimezoneLock(params: {
  entityType: FacilityEntityType;
  entityId: string;
  verifiedCountry?: string;
  verifiedTimezone?: string;
}) {
  const { data, error } = await supabase.functions.invoke<ApplyTimezoneLockResponse>("facility-verification", {
    body: {
      action: "apply_timezone_lock",
      entityType: params.entityType,
      entityId: params.entityId,
      verifiedCountry: params.verifiedCountry,
      verifiedTimezone: params.verifiedTimezone,
    },
  });

  if (error) throw error;
  if (!data?.ok) throw new Error((data as any)?.error || "Failed to apply verification timezone lock");
  return data;
}
