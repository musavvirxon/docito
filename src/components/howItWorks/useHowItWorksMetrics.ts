// File: src/hooks/useHowItWorksMetrics.ts
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HowItWorksMetrics = {
  verified_doctors: number;
  verified_facilities: number;
  appointments_7d: number;
};

type State =
  | { status: "idle" | "loading"; data: null; error: null }
  | { status: "success"; data: HowItWorksMetrics; error: null }
  | { status: "error"; data: null; error: string };

let memoryCache: { at: number; data: HowItWorksMetrics } | null = null;

const TTL_MS = 5 * 60 * 1000;

function safeNumber(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function useHowItWorksMetrics() {
  const [state, setState] = useState<State>({ status: "idle", data: null, error: null });

  const cached = useMemo(() => {
    if (!memoryCache) return null;
    if (Date.now() - memoryCache.at > TTL_MS) return null;
    return memoryCache.data;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cached) {
        setState({ status: "success", data: cached, error: null });
        return;
      }

      setState({ status: "loading", data: null, error: null });

      try {
        const { data, error } = await supabase.functions.invoke("get_public_metrics", { body: {} });
        if (error) throw new Error(error.message || "Failed to load metrics");

        const m = (data || {}) as Partial<HowItWorksMetrics>;
        const normalized: HowItWorksMetrics = {
          verified_doctors: safeNumber(m.verified_doctors),
          verified_facilities: safeNumber(m.verified_facilities),
          appointments_7d: safeNumber(m.appointments_7d),
        };

        memoryCache = { at: Date.now(), data: normalized };

        if (!cancelled) setState({ status: "success", data: normalized, error: null });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load metrics";
        if (!cancelled) setState({ status: "error", data: null, error: msg });
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [cached]);

  return state;
}
