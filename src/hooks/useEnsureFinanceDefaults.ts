// File: src/hooks/useEnsureFinanceDefaults.ts

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FinanceEntityType } from "@/components/financial/FinanceHub";

type Args = {
  entityType: FinanceEntityType;
  entityId: string;
};

export function useEnsureFinanceDefaults({ entityType, entityId }: Args) {
  const didRun = useRef<string | null>(null);

  useEffect(() => {
    if (!entityType || !entityId) return;

    const key = `${entityType}:${entityId}`;
    if (didRun.current === key) return;
    didRun.current = key;

    // Fire-and-forget: make sure the entity has default categories.
    // This is safe/idempotent on the server side.
    supabase.functions
      .invoke("finance-ensure-default-categories", {
        body: { entityType, entityId },
      })
      .catch(() => {
        // intentionally silent (we don't want to toast on every page view)
      });
  }, [entityType, entityId]);
}
