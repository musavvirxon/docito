// File: supabase/functions/_shared/security-middleware.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-user, x-requested-with",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

export function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
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
  return new Response(null, { status: 204, headers: { ...CORS_HEADERS } });
}

type SecureHandlerOptions = {
  requireAuth?: boolean;
  requireRoles?: string[];
  allowedMethods?: string[];
};

type SecureContext = {
  user: { id: string; email?: string | null } | null;
  token: string | null;
  anonClient: ReturnType<typeof createClient>;
  serviceClient: ReturnType<typeof createClient>;
};

type SecureHandlerResult =
  | { response: Response; context?: undefined }
  | { response?: undefined; context: SecureContext };

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

async function requireRole(serviceClient: ReturnType<typeof createClient>, userId: string, roles: string[]) {
  const { data, error } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const userRoles = new Set((data || []).map((r: any) => String(r.role)));
  return roles.some((r) => userRoles.has(r));
}

export async function secureHandler(req: Request, functionName: string, options: SecureHandlerOptions = {}) {
  try {
    const allowed = options.allowedMethods ?? ["POST", "OPTIONS"];
    if (req.method === "OPTIONS") return { response: corsPreflightResponse() };
    if (!allowed.includes(req.method)) return { response: errorResponse("Method not allowed", 405) };

    const supabaseUrl = getEnv("SUPABASE_URL");
    const anonKey = getEnv("SUPABASE_ANON_KEY");
    const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const token = getBearerToken(req);

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

    if (options.requireAuth) {
      if (!token) return { response: errorResponse("Missing Authorization bearer token", 401) };

      const { data, error } = await anonClient.auth.getUser(token);
      if (error || !data?.user?.id) {
        return { response: errorResponse("Invalid or expired token", 401) };
      }

      user = { id: data.user.id, email: data.user.email };
    }

    if (options.requireRoles?.length) {
      if (!user?.id) return { response: errorResponse("Unauthorized", 401) };

      const ok = await requireRole(serviceClient, user.id, options.requireRoles);
      if (!ok) return { response: errorResponse("Forbidden", 403) };
    }

    return {
      context: {
        user,
        token,
        anonClient,
        serviceClient,
      },
    };
  } catch (e: any) {
    console.error(`[${functionName}]`, e);
    return { response: errorResponse(e?.message || "Internal error", 500) };
  }
}
