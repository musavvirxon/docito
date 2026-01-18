// Path: src/hooks/useActiveEntityScope.ts

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccessScope, type AccessScope, type EntityType } from "@/hooks/useAccessScope";

const keyFor = (entityType: string) => `docito.activeEntity.${entityType}`;

export type ActiveEntityScopeResult = {
  loading: boolean;
  error: string | null;
  scopes: AccessScope[];
  activeScope: AccessScope | null;
  activeEntityId: string | null;
  setActiveEntityId: (entityId: string | null) => void;
  refetch: () => Promise<void> | void;
};

/**
 * Returns the user's permitted entities (from access-scope edge function) and a persisted
 * "active" entity selection per entity type (clinic/lab/imaging/pharmacy).
 */
export function useActiveEntityScope(entityType: EntityType) {
  const { loading, error, scopes, primary, refetch } = useAccessScope();
  const [activeEntityId, _setActiveEntityId] = useState<string | null>(null);

  const entityScopes = useMemo(() => {
    return (scopes || []).filter((s) => s.entity_type === entityType);
  }, [entityType, scopes]);

  const resolveDefault = useCallback((): string | null => {
    if (!entityScopes.length) return null;

    // 1) persisted selection
    const saved = localStorage.getItem(keyFor(entityType));
    if (saved && entityScopes.some((s) => s.entity_id === saved)) return saved;

    // 2) primary scope (if matches)
    if (primary?.entity_type === entityType && primary?.entity_id) return primary.entity_id;

    // 3) first available
    return entityScopes[0].entity_id;
  }, [entityScopes, entityType, primary?.entity_id, primary?.entity_type]);

  useEffect(() => {
    if (loading) return;
    const next = resolveDefault();
    _setActiveEntityId(next);
    if (next) localStorage.setItem(keyFor(entityType), next);
    else localStorage.removeItem(keyFor(entityType));
  }, [entityType, loading, resolveDefault]);

  const setActiveEntityId = useCallback(
    (entityId: string | null) => {
      if (!entityId) {
        _setActiveEntityId(null);
        localStorage.removeItem(keyFor(entityType));
        return;
      }

      // Only persist if it is actually in scope for this user
      const ok = entityScopes.some((s) => s.entity_id === entityId);
      if (!ok) return;

      _setActiveEntityId(entityId);
      localStorage.setItem(keyFor(entityType), entityId);
    },
    [entityScopes, entityType]
  );

  const activeScope = useMemo(() => {
    if (!activeEntityId) return null;
    return entityScopes.find((s) => s.entity_id === activeEntityId) ?? null;
  }, [activeEntityId, entityScopes]);

  const res: ActiveEntityScopeResult = useMemo(
    () => ({
      loading,
      error,
      scopes: entityScopes,
      activeScope,
      activeEntityId,
      setActiveEntityId,
      refetch,
    }),
    [activeEntityId, activeScope, entityScopes, error, loading, refetch, setActiveEntityId]
  );

  return res;
}
