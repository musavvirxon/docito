// Path: src/hooks/useAccessScope.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type EntityType = "clinic" | "lab" | "imaging" | "pharmacy";
export type EntityStatus = "active" | "pending" | "verified" | "suspended";

export type AccessScope = {
  entity_type: EntityType | string;
  entity_id: string;
  entity_name: string | null;
  entity_status: EntityStatus | string;
  scope_role: string | null;
  is_admin: boolean;
  permissions: Record<string, unknown> | null;
};

type AccessScopeResponse = {
  ok: boolean;
  userId: string;
  scopes: AccessScope[];
  primary: AccessScope | null;
};

export function useAccessScope() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scopes, setScopes] = useState<AccessScope[]>([]);
  const [primary, setPrimary] = useState<AccessScope | null>(null);

  const fetchScope = useCallback(async () => {
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("access-scope", {
        body: { action: "get" },
      });

      if (fnError) throw fnError;

      const res = data as AccessScopeResponse;
      if (!res?.ok) throw new Error((data as any)?.error || "Failed to load access scope");

      setScopes(res.scopes || []);
      setPrimary(res.primary || null);
    } catch (e: any) {
      setError(e?.message || "Failed to load access scope");
      setScopes([]);
      setPrimary(null);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchScope();
  }, [fetchScope]);

  const resolved = useMemo(() => {
    return {
      loading,
      error,
      scopes,
      primary,
      refetch: fetchScope,
    };
  }, [error, fetchScope, loading, primary, scopes]);

  return resolved;
}
