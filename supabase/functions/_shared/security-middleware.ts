// File: supabase/functions/_shared/security-middleware.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-user, x-requested-with",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE, PATCH",
  "Access-Control-Max-Age": "86400",
};

export function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

export function errorResponse(message: string, status = 400, code?: string) {
  return jsonResponse(
    {
      ok: false,
      error: message,
      code: code ?? undefined,
    },
    status,
  );
}

export function corsPreflightResponse() {
  return new Response(null, { status: 204, headers: { ...corsHeaders } });
}

export type SecureHandlerOptions = {
  requireAuth?: boolean;
  requireRoles?: string[];
  allowedMethods?: string[];
  rateLimit?: string;
  validationSchema?: any;
  logRequests?: boolean;
};

export type SecureContext = {
  user: { id: string; email?: string | null } | null;
  userId?: string; // convenience alias for user?.id
  token: string | null;
  ip: string;
  roles: string[];
  anonClient: any;
  serviceClient: any;
  supabase: any; // alias for anonClient (user-scoped)
};

type SecureHandlerResult =
  | { response: Response; context?: undefined; validatedBody?: undefined }
  | { response?: undefined; context: SecureContext; validatedBody: any };

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function getUserRoles(serviceClient: ReturnType<typeof createClient>, userId: string): Promise<string[]> {
  const { data, error } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) return [];
  return (data || []).map((r: any) => String(r.role)).filter(Boolean);
}

async function requireRole(serviceClient: ReturnType<typeof createClient>, userId: string, roles: string[]) {
  const userRoles = await getUserRoles(serviceClient, userId);
  return roles.some((r) => userRoles.includes(r));
}

function validateBody(body: any, schema: any): { valid: boolean; data: any; errors?: any[] } {
  if (!schema) return { valid: true, data: body };

  // If schema is an InputValidator instance with validate method
  if (schema && typeof schema.validate === "function") {
    return schema.validate(body);
  }

  // Simple schema object - just pass through with basic validation
  if (typeof schema === "object" && schema !== null) {
    // Basic field-level validation
    const errors: any[] = [];
    const validated: any = {};

    for (const [field, rule] of Object.entries(schema) as [string, any][]) {
      const value = body?.[field];

      if (rule.required && (value === undefined || value === null || value === "")) {
        errors.push({ field, message: `${field} is required`, code: "REQUIRED" });
        continue;
      }

      if (value !== undefined && value !== null) {
        // Type check
        if (rule.type === "uuid" && typeof value === "string") {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(value)) {
            errors.push({ field, message: `${field} must be a valid UUID`, code: "INVALID_UUID" });
            continue;
          }
        }

        if (rule.type === "string" && typeof value !== "string") {
          errors.push({ field, message: `${field} must be a string`, code: "INVALID_TYPE" });
          continue;
        }

        if (rule.enum && typeof value === "string" && !rule.enum.includes(value)) {
          errors.push({ field, message: `${field} must be one of: ${rule.enum.join(", ")}`, code: "INVALID_ENUM" });
          continue;
        }

        let processed = value;
        if (typeof value === "string") {
          if (rule.trim) processed = processed.trim();
          if (rule.sanitize) processed = processed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
          if (rule.maxLength && processed.length > rule.maxLength) {
            processed = processed.slice(0, rule.maxLength);
          }
        }

        validated[field] = processed;
      }
    }

    if (errors.length > 0) return { valid: false, data: null, errors };
    return { valid: true, data: validated };
  }

  return { valid: true, data: body };
}

export async function secureHandler(
  req: Request,
  functionName: string,
  options: SecureHandlerOptions = {},
): Promise<SecureHandlerResult> {
  try {
    const allowed = options.allowedMethods ?? ["POST", "OPTIONS"];
    if (req.method === "OPTIONS") return { response: corsPreflightResponse() };
    if (!allowed.includes(req.method)) return { response: errorResponse("Method not allowed", 405) };

    const supabaseUrl = getEnv("SUPABASE_URL");
    const anonKey = getEnv("SUPABASE_ANON_KEY");
    const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const token = getBearerToken(req);
    const ip = getClientIp(req);

    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    });

    const serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    let user: { id: string; email?: string | null } | null = null;
    let roles: string[] = [];

    if (options.requireAuth) {
      if (!token) return { response: errorResponse("Missing Authorization bearer token", 401) };

      const { data, error } = await anonClient.auth.getUser(token);
      if (error || !data?.user?.id) {
        return { response: errorResponse("Invalid or expired token", 401) };
      }

      user = { id: data.user.id, email: data.user.email };
      roles = await getUserRoles(serviceClient, data.user.id);
    }

    if (options.requireRoles?.length) {
      if (!user?.id) return { response: errorResponse("Unauthorized", 401) };

      const ok = options.requireRoles.some((r) => roles.includes(r));
      if (!ok) return { response: errorResponse("Forbidden", 403) };
    }

    // Parse and validate body
    let validatedBody: any = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      try {
        const rawBody = await req.json();
        if (options.validationSchema) {
          const result = validateBody(rawBody, options.validationSchema);
          if (!result.valid) {
            return { response: errorResponse(`Validation failed: ${result.errors?.map((e: any) => e.message).join(", ")}`, 400) };
          }
          validatedBody = result.data;
        } else {
          validatedBody = rawBody;
        }
      } catch {
        if (options.validationSchema) {
          return { response: errorResponse("Invalid JSON body", 400) };
        }
        validatedBody = null;
      }
    }

    if (options.logRequests) {
      console.log(`[${functionName}] ${req.method} by ${user?.id || "anon"} from ${ip}`);
    }

    const context: SecureContext = {
      user,
      userId: user?.id,
      token,
      ip,
      roles,
      anonClient,
      serviceClient,
      supabase: anonClient, // user-scoped client alias
    };

    return { context, validatedBody };
  } catch (e: any) {
    console.error(`[${functionName}]`, e);
    return { response: errorResponse(e?.message || "Internal error", 500) };
  }
}