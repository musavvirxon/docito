// Path: src/lib/timezoneApi.ts
import { supabase } from "@/integrations/supabase/client";

type Target = "profile" | "entity";
type EntityType = "practice" | "clinic" | "lab" | "imaging" | "pharmacy";
type Source = "browser" | "ip" | "manual" | "verification" | "admin";

type TimezoneUpdateResponse =
  | {
      ok: true;
      target: Target;
      timezone: string;
      timezone_source: string;
      timezone_locked: boolean;
      timezone_updated_at: string | null;
      entity?: { entity_type: EntityType; entity_id: string; entity_status: string | null } | null;
    }
  | { ok: false; error: string; code?: string };

type TimezoneDetectResponse =
  | {
      ok: true;
      timezone: string;
      timezone_source: "browser" | "ip" | "manual" | "verification" | "admin" | "signup";
      updated: boolean;
    }
  | { ok: false; error: string; code?: string };

export async function updateProfileTimezone(timezone: string, source: Source = "manual") {
  const { data, error } = await supabase.functions.invoke<TimezoneUpdateResponse>("timezone-update", {
    body: { action: "set", target: "profile", timezone, source },
  });

  if (error) throw error;
  if (!data?.ok) throw new Error((data as any)?.error || "Failed to update timezone");
  return data;
}

export async function updateEntityTimezone(
  entityType: EntityType,
  entityId: string,
  timezone: string,
  source: Source = "manual",
) {
  const { data, error } = await supabase.functions.invoke<TimezoneUpdateResponse>("timezone-update", {
    body: { action: "set", target: "entity", entityType, entityId, timezone, source },
  });

  if (error) throw error;
  if (!data?.ok) throw new Error((data as any)?.error || "Failed to update entity timezone");
  return data;
}

export async function detectProfileTimezone(candidateTimezone?: string) {
  const { data, error } = await supabase.functions.invoke<TimezoneDetectResponse>("timezone-detect", {
    body: { action: "detect", target: "profile", timezone: candidateTimezone },
  });

  if (error) throw error;
  if (!data?.ok) throw new Error((data as any)?.error || "Failed to detect timezone");
  return data;
}
