import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TimeRange = "7d" | "30d" | "90d";

function rangeToDays(range: TimeRange): 7 | 30 | 90 {
  if (range === "30d") return 30;
  if (range === "90d") return 90;
  return 7;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // anon + user JWT => RLS + auth.uid() works
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = (await req.json().catch(() => ({}))) as { lab_center_id?: string; time_range?: TimeRange };
    const labCenterId = body.lab_center_id;
    const timeRange = (body.time_range ?? "7d") as TimeRange;

    if (!labCenterId) {
      return new Response(JSON.stringify({ error: "lab_center_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["7d", "30d", "90d"].includes(timeRange)) {
      return new Response(JSON.stringify({ error: "Invalid time_range" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const days = rangeToDays(timeRange);

    const { data, error } = await supabase.rpc("get_lab_analytics", {
      p_lab_center_id: labCenterId,
      p_days: days,
    });

    if (error) {
      console.error("get_lab_analytics error:", error);
      return new Response(JSON.stringify({ error: "Failed to load analytics" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ analytics: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lab-analytics error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
