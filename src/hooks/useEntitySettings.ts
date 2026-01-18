// File: src/hooks/useEntitySettings.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type EntityType = "practice" | "clinic" | "lab" | "imaging" | "pharmacy";

export type EntitySettings = {
  id?: string;
  entity_type: EntityType;
  entity_id: string;

  display_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;

  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;

  timezone: string | null;
  logo_url: string | null;

  hours: Record<string, any>;
  notification_prefs: Record<string, any>;
  billing_prefs: Record<string, any>;
  integrations: Record<string, any>;

  updated_at?: string;
  created_at?: string;
};

type GetRes = { ok: boolean; settings: EntitySettings | null; error?: string };
type SaveRes = { ok: boolean; settings: EntitySettings; error?: string };

export function useEntitySettings(entityType: EntityType, entityId: string | null) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<EntitySettings | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!entityId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke<GetRes>("entity-settings", {
        body: { action: "get", entityType, entityId },
      });
      if (fnErr) throw fnErr;
      if (!data?.ok) throw new Error(data?.error || "Failed to load settings");

      setSettings(
        data.settings || {
          entity_type: entityType,
          entity_id: entityId,
          display_name: null,
          phone: null,
          email: null,
          website: null,
          address_line1: null,
          address_line2: null,
          city: null,
          region: null,
          postal_code: null,
          country: null,
          timezone: "UTC",
          logo_url: null,
          hours: {},
          notification_prefs: {},
          billing_prefs: {},
          integrations: {},
        }
      );
    } catch (e: any) {
      setError(e?.message || "Failed to load settings");
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!entityId) throw new Error("Missing entityId");

      setSaving(true);
      setError(null);

      try {
        const { data, error: fnErr } = await supabase.functions.invoke<SaveRes>("entity-settings", {
          body: { action: "save", entityType, entityId, payload },
        });

        if (fnErr) throw fnErr;
        if (!data?.ok) throw new Error(data?.error || "Failed to save settings");

        setSettings(data.settings);
        return data.settings;
      } finally {
        setSaving(false);
      }
    },
    [entityId, entityType]
  );

  const resolved = useMemo(() => {
    return { loading, saving, error, settings, refetch: fetchSettings, saveSettings };
  }, [error, fetchSettings, loading, saveSettings, saving, settings]);

  return resolved;
}
