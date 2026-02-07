// supabase/functions/track_marketing_event/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

import {
  secureHandler,
  jsonResponse,
  errorResponse,
} from "../_shared/security-middleware.ts";

import {
  MAX_LENGTHS,
  PATTERNS,
  type ValidationSchema,
} from "../_shared/input-validator.ts";

type TrackMarketingEventBody = {
  event_name: string;
  page_path: string;
  meta?: Record<string, unknown> | null;
};

const validationSchema: ValidationSchema<TrackMarketingEventBody> = {
  event_name: {
    type: "string",
    required: true,
    maxLength: 120,
    pattern: PATTERNS.noXss,
  },
  page_path: {
    type: "string",
    required: true,
    maxLength: 500,
    pattern: PATTERNS.noXss,
  },
  meta: {
    type: "object",
    required: false,
    maxLength: MAX_LENGTHS.json,
  },
};

serve(async (req) => {
  const { response, context, validatedBody, requestId } = await secureHandler(
    req,
    "track_marketing_event",
    {
      allowedMethods: ["POST", "OPTIONS"],
      requireAuth: false,
      rateLimit: "form",
      validationSchema,
      logRequests: false,
    }
  );

  if (response) return response;
  if (!context) return errorResponse("security_context_missing", 500, null, requestId);

  // Require Authorization header (anon or user JWT)
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return errorResponse("missing_authorization", 401, null, requestId);
  }

  const body = validatedBody as TrackMarketingEventBody;

  const insertPayload = {
    event_name: body.event_name,
    page_path: body.page_path,
    meta: body.meta ?? null,
    user_id: context.userId ?? null,
    ip_address: context.ip && context.ip !== "unknown" ? context.ip : null,
    user_agent: context.userAgent ?? null,
    referrer: req.headers.get("referer") ?? null,
  };

  const { error } = await context.serviceClient
    .from("marketing_events")
    .insert(insertPayload);

  if (error) {
    return errorResponse(
      "failed_to_record",
      500,
      { message: error.message },
      requestId
    );
  }

  return jsonResponse({ ok: true }, requestId);
});
