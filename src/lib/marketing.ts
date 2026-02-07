// src/lib/marketing.ts
import { supabase } from "@/integrations/supabase/client";

export type MarketingEventMeta = Record<string, unknown>;

/**
 * Fire-and-forget marketing / conversion tracking.
 * This is intentionally best-effort (never throws to callers).
 */
export async function trackMarketingEvent(
  eventName: string,
  meta?: MarketingEventMeta
): Promise<void> {
  try {
    const pagePath =
      typeof window !== "undefined" ? window.location.pathname : "unknown";

    await supabase.functions.invoke("track_marketing_event", {
      body: {
        event_name: eventName,
        page_path: pagePath,
        meta: meta ?? null,
      },
    });
  } catch {
    // Intentionally swallow tracking errors
  }
}
