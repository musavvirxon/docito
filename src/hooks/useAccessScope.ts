// File: src/hooks/useAccessScope.ts

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AccessEntityType = "clinic" | "lab" | "imaging" | "pharmacy" | "none";

export type AccessScope = {
  entity_type: AccessEntityType;
  entity_id: string | null;
  staff_role: string | null;
  status: string;
  permissions: Record<string, boolean>;
};

export function useAccessScope() {
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<AccessScope | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("access-scope", {
        body: {},
      });

      if (fnError) throw fnError;

      const s = (data as any)?.scope as AccessScope | undefined;
      setScope(s ?? null);
    } catch (e: any) {
      setError(e?.message || "Failed to load access scope");
      setScope(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { loading, scope, error, refetch };
}
