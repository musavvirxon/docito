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

    supabase.functions
      .invoke("finance-ensure-default-categories", {
        body: { entityType, entityId },
      })
      .catch(() => {
        // intentionally silent
      });
  }, [entityType, entityId]);
}
