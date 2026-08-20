import { useEffect, useState } from "react";

const CACHE_KEY = "geo_country_v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry = { country: string; ts: number };

function readCache(): string | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.country || Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.country;
  } catch {
    return null;
  }
}

function writeCache(country: string) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ country, ts: Date.now() } satisfies CacheEntry));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

/** Heuristic fallback when the IP lookup is unavailable or blocked. */
function fallbackCountry(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === "Asia/Tashkent" || tz === "Asia/Samarkand") return "UZ";
  } catch {
    // ignore
  }
  const langs = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
  if (langs.some((l) => l.toLowerCase().startsWith("uz"))) return "UZ";
  return null;
}

function urlOverride(): string | null {
  try {
    const p = new URLSearchParams(window.location.search).get("country");
    return p ? p.toUpperCase() : null;
  } catch {
    return null;
  }
}

async function lookupCountry(signal: AbortSignal): Promise<string | null> {
  const endpoints: Array<{ url: string; pick: (j: any) => string | undefined }> = [
    { url: "https://ipwho.is/?fields=country_code", pick: (j) => j?.country_code },
    { url: "https://ipapi.co/json/", pick: (j) => j?.country_code },
  ];
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, { signal });
      if (!res.ok) continue;
      const json = await res.json();
      const code = ep.pick(json);
      if (typeof code === "string" && code.length === 2) return code.toUpperCase();
    } catch {
      // try next endpoint
    }
  }
  return null;
}

/**
 * Detects the visitor's country via IP geolocation, with timezone/language fallbacks.
 * Result is cached in localStorage for 24h. `?country=UZ` forces a value (testing).
 */
export function useGeoCountry() {
  const override = urlOverride();
  const [country, setCountry] = useState<string | null>(() => override ?? readCache());
  const [loading, setLoading] = useState(() => !override && !readCache());

  useEffect(() => {
    if (override || readCache()) return;
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      const detected = (await lookupCountry(controller.signal)) ?? fallbackCountry();
      if (cancelled) return;
      if (detected) {
        writeCache(detected);
        setCountry(detected);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [override]);

  return { country, isUzbekistan: country === "UZ", loading };
}
