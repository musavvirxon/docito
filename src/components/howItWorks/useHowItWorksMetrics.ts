// File: src/components/howItWorks/useHowItWorksMetrics.ts
import { supabase } from "@/integrations/supabase/client";

export type HowItWorksMetrics = {
  verified_doctors: number;
  verified_facilities: number;
  appointments_7d: number;
};

type Cache = {
  value: HowItWorksMetrics | null;
  ts: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache: Cache = { value: null, ts: 0 };

function nowMs() {
  return Date.now();
}

export async function getHowItWorksMetrics(): Promise<HowItWorksMetrics> {
  const fresh = cache.value && nowMs() - cache.ts < CACHE_TTL_MS;
  if (fresh) return cache.value as HowItWorksMetrics;

  const { data, error } = await supabase.functions.invoke("get_public_metrics", {
    body: {},
  });

  if (error) {
    throw error;
  }

  const parsed: HowItWorksMetrics = {
    verified_doctors: Number(data?.verified_doctors ?? 0),
    verified_facilities: Number(data?.verified_facilities ?? 0),
    appointments_7d: Number(data?.appointments_7d ?? 0),
  };

  cache.value = parsed;
  cache.ts = nowMs();
  return parsed;
}
