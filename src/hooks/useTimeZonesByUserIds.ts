// File: src/hooks/useTimeZonesByUserIds.ts

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TimezoneMap = Record<string, string>;

function uniq(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

export function useTimeZonesByUserIds(userIds: string[]) {
  const ids = useMemo(() => uniq(userIds), [userIds.join("|")]);
  const [loading, setLoading] = useState(false);
  const [map, setMap] = useState<TimezoneMap>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!ids.length) {
        setMap({});
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: qErr } = await supabase
          .from("profiles")
          .select("user_id, timezone")
          .in("user_id", ids);

        if (qErr) throw qErr;

        const next: TimezoneMap = {};
        for (const row of data || []) {
          const uid = String((row as any).user_id || "");
          const tz = String((row as any).timezone || "");
          if (uid) next[uid] = tz;
        }

        if (!cancelled) setMap(next);
      } catch (e: any) {
        if (!cancelled) {
          setMap({});
          setError(String(e?.message || "Failed to load timezones"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [ids.join("|")]);

  return { loading, map, error };
}
