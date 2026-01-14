import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "list" | "submit" | "update";

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

    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = (await req.json().catch(() => ({}))) as {
      action?: Action;
      lab_center_id?: string;

      claim_id?: string;
      status?: "pending" | "submitted" | "approved" | "rejected" | "paid";
      approved_amount?: number | null;
      copay_amount?: number | null;
      notes?: string | null;
    };

    const action = (body.action ?? "list") as Action;
    const labCenterId = body.lab_center_id;

    if (!labCenterId) {
      return new Response(JSON.stringify({ error: "lab_center_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      const { data, error } = await supabase
        .from("lab_insurance_claims_view")
        .select("*")
        .eq("lab_center_id", labCenterId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("lab-claims list error:", error);
        return new Response(JSON.stringify({ error: "Failed to load claims" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ claims: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claimId = body.claim_id;
    if (!claimId) {
      return new Response(JSON.stringify({ error: "claim_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "submit") {
      const { data, error } = await supabase
        .from("lab_insurance_claims")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", claimId)
        .eq("lab_center_id", labCenterId)
        .in("status", ["pending"])
        .select()
        .single();

      if (error) {
        console.error("lab-claims submit error:", error);
        return new Response(JSON.stringify({ error: "Failed to submit claim" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ claim: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // action === "update"
    const nextStatus = body.status;
    if (!nextStatus) {
      return new Response(JSON.stringify({ error: "status is required for update" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const processedStatuses = new Set(["approved", "rejected", "paid"]);
    const updatePayload: Record<string, unknown> = {
      status: nextStatus,
      approved_amount: body.approved_amount ?? null,
      copay_amount: body.copay_amount ?? null,
      notes: body.notes ?? null,
    };

    if (processedStatuses.has(nextStatus)) {
      updatePayload.processed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("lab_insurance_claims")
      .update(updatePayload)
      .eq("id", claimId)
      .eq("lab_center_id", labCenterId)
      .select()
      .single();

    if (error) {
      console.error("lab-claims update error:", error);
      return new Response(JSON.stringify({ error: "Failed to update claim" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ claim: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lab-claims error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
