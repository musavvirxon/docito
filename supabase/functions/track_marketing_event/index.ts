// File: supabase/functions/track_marketing_event/index.ts

/**
 * Track Marketing Event Edge Function
 *
 * Records lightweight marketing/product events (CTA clicks, signups, etc.).
 * - Supports anonymous + authenticated calls (user_id is nullable)
 * - Uses service role to insert (RLS can remain locked down)
 * - Includes rate limiting + schema validation
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  secureHandler,
  jsonResponse,
  errorResponse,
} from "../_shared/security-middleware.ts";
import { sanitizeString } from "../_shared/input-validator.ts";

const marketingEventSchema = {
  event_name: {
    type: "string" as const,
    required: true,
    minLength: 2,
    maxLength: 80,
    sanitize: true,
  },
  page_path: {
    type: "string" as const,
    required: false,
    maxLength: 300,
    sanitize: true,
  },
  referrer: {
    type: "string" as const,
    required: false,
    maxLength: 500,
    sanitize: true,
  },
  user_agent: {
    type: "string" as const,
    required: false,
    maxLength: 500,
    sanitize: true,
  },
  meta: {
    type: "object" as const,
    required: false,
  },
};

serve(async (req) => {
  const { response, context, validatedBody } = await secureHandler(
    req,
    "track_marketing_event",
    {
      rateLimit: "standard",
      requireAuth: false,
      allowedMethods: ["POST", "OPTIONS"],
      validationSchema: marketingEventSchema,
      logRequests: false,
    }
  );

  if (response) return response;
  if (!context || !validatedBody) {
    return errorResponse("Internal server error", 500);
  }

  try {
    const body = validatedBody as Record<string, unknown>;

    const eventNameRaw = String(body.event_name || "");
    const event_name = sanitizeString(eventNameRaw, 80);

    const page_path = body.page_path
      ? sanitizeString(String(body.page_path), 300)
      : null;

    const referrer = body.referrer
      ? sanitizeString(String(body.referrer), 500)
      : req.headers.get("referer")
        ? sanitizeString(String(req.headers.get("referer")), 500)
        : null;

    const uaFromBody = body.user_agent ? String(body.user_agent) : "";
    const user_agent = sanitizeString((context as any).userAgent || uaFromBody, 500);

    const meta =
      body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)
        ? (body.meta as Record<string, unknown>)
        : {};

    const insertRow = {
      user_id: context.user?.id ?? null,
      event_name,
      page_path,
      referrer,
      user_agent: user_agent || null,
      ip: context.ip && context.ip !== "unknown" ? context.ip : null,
      meta,
    };

    const { error } = await context.serviceClient
      .from("marketing_events")
      .insert(insertRow);

    if (error) {
      console.error("track_marketing_event insert error:", error);
      return errorResponse("Failed to record event", 400);
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error("track_marketing_event error:", e);
    return errorResponse("Internal server error", 500);
  }
});
