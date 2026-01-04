import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerifyEntityRequest {
  entity_id: string;
  action: "approve" | "reject" | "suspend";
  comment?: string;
  entity_type?: "clinic" | "pharmacy" | "lab" | "imaging" | "doctor";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is super admin
    const { data: superAdminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!superAdminRole) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: super admin required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { entity_id, action, comment, entity_type = "clinic" } =
      (await req.json()) as VerifyEntityRequest;

    if (!entity_id || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: entity_id, action" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!["approve", "reject", "suspend"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Must be: approve, reject, or suspend" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Determine status based on action
    const statusMap: Record<string, string> = {
      approve: "verified",
      reject: "rejected",
      suspend: "suspended",
    };
    const newStatus = statusMap[action];

    // Update entity based on type
    let updateResult;
    let verificationTable: string;
    
    switch (entity_type) {
      case "doctor":
        verificationTable = "doctor_verification";
        updateResult = await supabase
          .from("doctor_verification")
          .update({ 
            status: newStatus,
            rejection_reason: action === "reject" ? comment : null,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id
          })
          .eq("doctor_id", entity_id);

        // Also update doctor verified flag
        if (action === "approve") {
          await supabase
            .from("doctors")
            .update({ verified: true })
            .eq("id", entity_id);
        } else {
          await supabase
            .from("doctors")
            .update({ verified: false })
            .eq("id", entity_id);
        }
        break;
        
      case "pharmacy":
        verificationTable = "pharmacies";
        updateResult = await supabase
          .from("pharmacies")
          .update({ 
            verified: action === "approve",
            status: newStatus
          })
          .eq("id", entity_id);
        break;
        
      case "lab":
        verificationTable = "lab_centers";
        updateResult = await supabase
          .from("lab_centers")
          .update({ 
            is_verified: action === "approve",
            status: newStatus
          })
          .eq("id", entity_id);
        break;
        
      case "imaging":
        verificationTable = "imaging_centers";
        updateResult = await supabase
          .from("imaging_centers")
          .update({ 
            is_verified: action === "approve",
            status: newStatus
          })
          .eq("id", entity_id);
        break;
        
      default: // clinic/practice
        verificationTable = "practices";
        updateResult = await supabase
          .from("practices")
          .update({ 
            is_verified: action === "approve",
            status: newStatus
          })
          .eq("id", entity_id);
    }

    if (updateResult.error) {
      throw updateResult.error;
    }

    // Write audit log
    await supabase.from("entity_audit_logs").insert({
      entity_type: entity_type,
      entity_id: entity_id,
      action: `verification_${action}`,
      actor_id: user.id,
      new_values: { status: newStatus },
      metadata: { comment, previous_status: null },
    });

    // Send notification to entity admin (if applicable)
    // TODO: Add notification logic

    return new Response(
      JSON.stringify({ 
        ok: true,
        entity_id,
        action,
        new_status: newStatus
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify_entity:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
