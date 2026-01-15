// File: src/lib/pgrstSchemaRetry.ts

import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function isSchemaCacheError(err: unknown): boolean {
  const e = err as PostgrestError | { message?: string } | null;
  const msg = (e?.message || "").toLowerCase();
  return (
    msg.includes("schema cache") ||
    msg.includes("could not find the table") ||
    msg.includes("failed to fetch") ||
    msg.includes("relation") && msg.includes("does not exist")
  );
}

/**
 * If PostgREST schema cache is stale (common after migrations), reload and retry once.
 * Use for direct .from() queries that fail with "Could not find the table ... in the schema cache".
 */
export async function withSchemaReloadRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isSchemaCacheError(err)) throw err;

    // Best-effort schema reload (ignore errors)
    try {
      await (supabase.rpc as any)("reload_pgrst_schema");
    } catch {
      // ignore
    }

    // Retry once
    return await fn();
  }
}
