// Path: supabase/functions/timezone-detect/index.ts
/**
 * Timezone Detect Edge Function (Step 5)
 *
 * Purpose:
 * - Ensure the authenticated user's profile has a valid IANA timezone.
 * - Prefer client-provided timezone (browser) when valid.
 * - Fallback to IP-based detection when missing/invalid.
 *
 * Security:
 * - CORS
 * - Authorization required
 * - Uses service role client for profile updates
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { secureHandler, jsonResponse } from "../_shared/security-middleware.ts";
import { validateString } from "../_shared/input-validator.ts";

type ReqBody = {
  action: "detect";
  target: "profile";
  timezone?: string;
};

type Resp =
  | {
      ok: true;
      timezone: string;
      timezone_source: "browser" | "ip" | "manual" | "verification" | "admin" | "signup";
      updated: boolean;
    }
  | { ok: false; error: string; code?: string };

function json(data: Resp, status = 200): Response {
  return jsonResponse(data, status);
}

function isValidIanaTimezone(tz: string): boolean {
  const cleaned = tz.trim();
  if (!cleaned || cleaned.length > 100) return false;
  if (/\s/.test(cleaned)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: cleaned }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function getRequestIp(req: Request): string | null {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf && cf.trim()) return cf.trim();

  const real = req.headers.get("x-real-ip");
  if (real && real.trim()) return real.trim();

  const fwd = req.headers.get("x-forwarded-for");
  if (fwd && fwd.trim()) {
    // may be "client, proxy1, proxy2"
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }

  return null;
}

async function fetchJson(url: string, timeoutMs = 3500): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "accept": "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function parseTimezoneFromProviderPayload(payload: any): string | null {
  if (!payload || typeof payload !== "object") return null;

  // ipapi.co: { timezone: "America/New_York", ... }
  if (typeof payload.timezone === "string" && payload.timezone.trim()) return payload.timezone.trim();

  // ipwho.is: { timezone: { id: "America/New_York", ... }, ... }
  if (payload.timezone && typeof payload.timezone === "object") {
    const id = payload.timezone.id;
    if (typeof id === "string" && id.trim()) return id.trim();
  }

  // ip-api.com: { timezone: "America/New_York", ... }
  if (typeof payload.timezone === "string" && payload.timezone.trim()) return payload.timezone.trim();

  // generic: { tz: "..." }
  if (typeof (payload as any).tz === "string" && (payload as any).tz.trim()) return (payload as any).tz.trim();

  return null;
}

async function lookupTimezoneByIp(ip: string | null): Promise<string | null> {
  const custom = Deno.env.get("IP_GEO_URL") || "";
  const customKey = Deno.env.get("IP_GEO_API_KEY") || "";

  // If a custom provider is configured, use it first.
  // Supports {ip} placeholder in URL.
  if (custom.trim()) {
    const url = custom.includes("{ip}") ? custom.replace("{ip}", encodeURIComponent(ip || "")) : custom;
    const u = customKey ? `${url}${url.includes("?") ? "&" : "?"}key=${encodeURIComponent(customKey)}` : url;
    const data = await fetchJson(u);
    const tz = parseTimezoneFromProviderPayload(data);
    if (tz && isValidIanaTimezone(tz)) return tz;
  }

  // Fallback providers (no key required, best-effort)
  // ipapi.co
  if (ip && ip.trim()) {
    const data = await fetchJson(`https://ipapi.co/${encodeURIComponent(ip.trim())}/json/`);
    const tz = parseTimezoneFromProviderPayload(data);
    if (tz && isValidIanaTimezone(tz)) return tz;
  } else {
    const data = await fetchJson(`https://ipapi.co/json/`);
    const tz = parseTimezoneFromProviderPayload(data);
    if (tz && isValidIanaTimezone(tz)) return tz;
  }

  // ipwho.is
  if (ip && ip.trim()) {
    const data = await fetchJson(`https://ipwho.is/${encodeURIComponent(ip.trim())}`);
    const tz = parseTimezoneFromProviderPayload(data);
    if (tz && isValidIanaTimezone(tz)) return tz;
  } else {
    const data = await fetchJson(`https://ipwho.is/`);
    const tz = parseTimezoneFromProviderPayload(data);
    if (tz && isValidIanaTimezone(tz)) return tz;
  }

  return null;
}

serve(async (req) => {
  const { response, context, validatedBody } = await secureHandler(req, "timezone-detect", {
    rateLimit: "standard",
    requireAuth: true,
    allowedMethods: ["POST", "OPTIONS"],
    validationSchema: {
      action: { type: "string", required: true, enum: ["detect"] as const },
      target: { type: "string", required: true, enum: ["profile"] as const },
      timezone: { type: "string", required: false, minLength: 1, maxLength: 100, trim: true, sanitize: true },
    },
    logRequests: false,
  });

  if (response) return response;
  if (!context || !validatedBody) return json({ ok: false, error: "Internal server error" }, 500);

  try {
    const body = validatedBody as ReqBody;
    const { userId, serviceClient } = context;

    if (!userId) return json({ ok: false, error: "Unauthorized" }, 401);
    if (body.action !== "detect" || body.target !== "profile") {
      return json({ ok: false, error: "Invalid request" }, 400);
    }

    const { data: profile, error: profErr } = await serviceClient
      .from("profiles")
      .select("timezone, timezone_source, timezone_locked")
      .eq("user_id", userId)
      .maybeSingle();

    if (profErr) throw profErr;
    if (!profile) return json({ ok: false, error: "Profile not found" }, 404);

    const currentTz = typeof profile.timezone === "string" ? profile.timezone : null;
    const currentSource = typeof profile.timezone_source === "string" ? profile.timezone_source : "signup";

    // If user manually set timezone, do not override.
    if (currentSource === "manual" && currentTz && isValidIanaTimezone(currentTz)) {
      return json({ ok: true, timezone: currentTz, timezone_source: "manual", updated: false });
    }

    // Prefer client timezone if valid
    const candidate = validateString(body.timezone, 1, 100);
    if (candidate && isValidIanaTimezone(candidate)) {
      const needsUpdate =
        !currentTz || !isValidIanaTimezone(currentTz) || currentTz !== candidate || currentSource !== "browser";

      if (!needsUpdate) {
        return json({ ok: true, timezone: currentTz!, timezone_source: "browser", updated: false });
      }

      const { data: updated, error: updErr } = await serviceClient
        .from("profiles")
        .update({
          timezone: candidate,
          timezone_source: "browser",
          timezone_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("user_id", userId)
        .select("timezone, timezone_source")
        .maybeSingle();

      if (updErr) throw updErr;

      return json({
        ok: true,
        timezone: (updated?.timezone as string) || candidate,
        timezone_source: "browser",
        updated: true,
      });
    }

    // Fallback to IP detection
    const ip = getRequestIp(req);
    const ipTz = await lookupTimezoneByIp(ip);
    const finalTz = ipTz || "UTC";

    const needsUpdate =
      !currentTz || !isValidIanaTimezone(currentTz) || currentTz !== finalTz || currentSource !== "ip";

    if (!needsUpdate) {
      return json({ ok: true, timezone: currentTz!, timezone_source: "ip", updated: false });
    }

    const { data: updated, error: updErr } = await serviceClient
      .from("profiles")
      .update({
        timezone: finalTz,
        timezone_source: "ip",
        timezone_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq("user_id", userId)
      .select("timezone, timezone_source")
      .maybeSingle();

    if (updErr) throw updErr;

    return json({
      ok: true,
      timezone: (updated?.timezone as string) || finalTz,
      timezone_source: "ip",
      updated: true,
    });
  } catch (e: any) {
    console.error("timezone-detect error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
