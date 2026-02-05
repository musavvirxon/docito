// Path: supabase/functions/facility-verification/index.ts
/**
 * Step 8 — Facility Verification Hook
 *
 * Apply verification timezone + lock for a facility entity.
 * - Requires auth
 * - Requires super_admin
 * - Sets entity_settings.timezone to:
 *   - verifiedTimezone (if valid IANA), else mapped timezone from verifiedCountry, else UTC
 * - Sets:
 *   - timezone_source = 'verification'
 *   - timezone_locked = true
 *   - verified_country / verified_timezone stored on entity_settings
 *
 * Note: DB triggers also apply timezone+lock automatically when a facility's verified flag/status changes.
 * This function is the explicit hook to call during the verification workflow to ensure correctness.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { secureHandler, jsonResponse } from "../_shared/security-middleware.ts";
import { validateUUID, validateString } from "../_shared/input-validator.ts";

type EntityType = "practice" | "clinic" | "lab" | "imaging" | "pharmacy";

type ReqBody = {
  action: "apply_timezone_lock";
  entityType: EntityType;
  entityId: string;
  verifiedCountry?: string;
  verifiedTimezone?: string;
};

type Resp =
  | {
      ok: true;
      entityType: EntityType;
      entityId: string;
      appliedTimezone: string;
      timezoneSource: "verification";
      timezoneLocked: true;
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

function normalizeEntityType(input: unknown): EntityType | null {
  const v = validateString(input, 1, 24);
  if (!v) return null;
  const t = v.toLowerCase();
  if (t === "practice" || t === "clinic" || t === "lab" || t === "imaging" || t === "pharmacy") return t;
  return null;
}

function normalizeCountry(input: unknown): string | null {
  const v = validateString(input, 1, 120);
  if (!v) return null;
  return v.trim();
}

function normalizeTimezone(input: unknown): string | null {
  const v = validateString(input, 1, 100);
  if (!v) return null;
  const tz = v.trim();
  return tz;
}

serve(async (req) => {
  const { response, context, validatedBody } = await secureHandler(req, "facility-verification", {
    rateLimit: "standard",
    requireAuth: true,
    allowedMethods: ["POST", "OPTIONS"],
    validationSchema: {
      action: { type: "string", required: true, enum: ["apply_timezone_lock"] as const },
      entityType: {
        type: "string",
        required: true,
        enum: ["practice", "clinic", "lab", "imaging", "pharmacy"] as const,
        trim: true,
        sanitize: true,
      },
      entityId: { type: "uuid", required: true },
      verifiedCountry: { type: "string", required: false, minLength: 1, maxLength: 120, trim: true, sanitize: true },
      verifiedTimezone: { type: "string", required: false, minLength: 1, maxLength: 100, trim: true, sanitize: true },
    },
    logRequests: false,
  });

  if (response) return response;
  if (!context || !validatedBody) return json({ ok: false, error: "Internal server error" }, 500);

  try {
    const { roles, serviceClient } = context;

    if (!roles.includes("super_admin")) {
      return json({ ok: false, error: "Forbidden", code: "FORBIDDEN" }, 403);
    }

    const body = validatedBody as ReqBody;

    const entityType = normalizeEntityType(body.entityType);
    const entityId = validateUUID(body.entityId);
    if (!entityType || !entityId) return json({ ok: false, error: "Invalid entityType/entityId" }, 400);

    const verifiedCountry = normalizeCountry(body.verifiedCountry);
    const candidateTz = normalizeTimezone(body.verifiedTimezone);

    const verifiedTimezone = candidateTz && isValidIanaTimezone(candidateTz) ? candidateTz : null;

    // Apply via RPC (DB will map country->tz if verifiedTimezone is null/invalid)
    const { error: rpcErr } = await serviceClient.rpc("docito_apply_entity_verification_timezone", {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_verified_country: verifiedCountry,
      p_verified_timezone: verifiedTimezone,
    } as any);

    if (rpcErr) throw rpcErr;

    // Read back the applied timezone for response
    const { data: es, error: selErr } = await serviceClient
      .from("entity_settings")
      .select("timezone, timezone_source, timezone_locked")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle();

    if (selErr) throw selErr;

    const appliedTimezone = (es?.timezone as string) || (verifiedTimezone || "UTC");

    return json({
      ok: true,
      entityType,
      entityId,
      appliedTimezone,
      timezoneSource: "verification",
      timezoneLocked: true,
    });
  } catch (e: any) {
    console.error("facility-verification error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
