import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) return json({ error: "Service unavailable" }, 503);

    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const raw = await req.json().catch(() => ({}));
    const doctorId = typeof raw?.doctor_id === "string" ? raw.doctor_id : null;
    const practiceId = typeof raw?.practice_id === "string" ? raw.practice_id : null;
    const branchId = typeof raw?.branch_id === "string" ? raw.branch_id : null;
    const lang = typeof raw?.lang === "string" ? raw.lang.slice(0, 5) : "en";
    if (!doctorId && !practiceId) return json({ error: "doctor_id or practice_id required" }, 400);

    const admin = createClient(url, serviceKey);
    const { data, error } = await admin.rpc("get_document_branding_v2", {
      _practice_id: practiceId,
      _doctor_id: doctorId,
      _branch_id: branchId,
      _lang: lang,
    });
    if (error) {
      console.warn("[document-branding] lookup denied or failed", { code: error.code });
      return json({ error: error.code === "42501" ? "Forbidden" : "Branding unavailable" }, error.code === "42501" ? 403 : 500);
    }
    return json({ branding: Array.isArray(data) ? data[0] || null : data || null });
  } catch (error) {
    console.error("[document-branding] unexpected failure", error instanceof Error ? error.message : "unknown");
    return json({ error: "Branding unavailable" }, 500);
  }
});