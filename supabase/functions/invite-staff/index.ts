// File: supabase/functions/invite-staff/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Backwards-compatible wrapper.
// Historically this function accepted entity_type values like "clinic" | "pharmacy" | "lab" | "imaging"
// and inserted into a mismatched staff_invitations schema.
// Phase 2 moves canonical staff invitation logic into `staff-management`.

type LegacyEntityType = "clinic" | "pharmacy" | "lab" | "imaging";

function mapEntityType(t: LegacyEntityType): "practice" | "pharmacy" | "lab" | "imaging_center" {
  switch (t) {
    case "clinic":
      return "practice";
    case "imaging":
      return "imaging_center";
    default:
      return t;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const payload = (await req.json()) as {
      entity_id: string;
      email: string;
      role: string;
      entity_type?: LegacyEntityType;
    };

    if (!payload?.entity_id || !payload?.email || !payload?.role) {
      return new Response(JSON.stringify({ error: "Missing required fields: entity_id, email, role" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const entityType = mapEntityType(payload.entity_type ?? "clinic");

    // Call local edge function: staff-management
    // Using fetch to avoid dependency loops.
    const url = new URL(req.url);
    url.pathname = url.pathname.replace(/\/invite-staff\/?$/, "/staff-management");

    const resp = await fetch(url.toString(), {
      method: "POST",
      headers: {
        authorization: authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        action: "create_invite",
        entityType,
        entityId: payload.entity_id,
        email: payload.email,
        role: payload.role,
        sendEmail: true,
      }),
    });

    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
