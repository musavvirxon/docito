import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BulkActionRequest {
  entity_ids: string[];
  action: "approve" | "reject" | "suspend" | "delete";
  entity_type?: "clinic" | "pharmacy" | "lab" | "imaging" | "doctor";
  comment?: string;
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

    const { entity_ids, action, entity_type = "clinic", comment } =
      (await req.json()) as BulkActionRequest;

    if (!entity_ids || !Array.isArray(entity_ids) || entity_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid entity_ids array" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!action || !["approve", "reject", "suspend", "delete"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Must be: approve, reject, suspend, or delete" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Status mapping
    const statusMap: Record<string, string> = {
      approve: "verified",
      reject: "rejected",
      suspend: "suspended",
    };

    let updatedCount = 0;
    const errors: { entity_id: string; error: string }[] = [];

    // Process each entity
    for (const entity_id of entity_ids) {
      try {
        if (action === "delete") {
          // Soft delete - just update status
          let deleteResult;
          switch (entity_type) {
            case "doctor":
              deleteResult = await supabase
                .from("doctor_verification")
                .update({ status: "deleted" })
                .eq("doctor_id", entity_id);
              break;
            case "pharmacy":
              deleteResult = await supabase
                .from("pharmacies")
                .update({ status: "deleted" })
                .eq("id", entity_id);
              break;
            case "lab":
              deleteResult = await supabase
                .from("lab_centers")
                .update({ status: "deleted" })
                .eq("id", entity_id);
              break;
            case "imaging":
              deleteResult = await supabase
                .from("imaging_centers")
                .update({ status: "deleted" })
                .eq("id", entity_id);
              break;
            default:
              deleteResult = await supabase
                .from("practices")
                .update({ status: "deleted" })
                .eq("id", entity_id);
          }

          if (deleteResult.error) throw deleteResult.error;
        } else {
          // Update verification status
          const newStatus = statusMap[action];
          
          switch (entity_type) {
            case "doctor":
              await supabase
                .from("doctor_verification")
                .update({ 
                  status: newStatus,
                  rejection_reason: action === "reject" ? comment : null,
                  reviewed_at: new Date().toISOString(),
                  reviewed_by: user.id
                })
                .eq("doctor_id", entity_id);

              await supabase
                .from("doctors")
                .update({ verified: action === "approve" })
                .eq("id", entity_id);
              break;
              
            case "pharmacy":
              await supabase
                .from("pharmacies")
                .update({ 
                  verified: action === "approve",
                  status: newStatus
                })
                .eq("id", entity_id);
              break;
              
            case "lab":
              await supabase
                .from("lab_centers")
                .update({ 
                  is_verified: action === "approve",
                  status: newStatus
                })
                .eq("id", entity_id);
              break;
              
            case "imaging":
              await supabase
                .from("imaging_centers")
                .update({ 
                  is_verified: action === "approve",
                  status: newStatus
                })
                .eq("id", entity_id);
              break;
              
            default:
              await supabase
                .from("practices")
                .update({ 
                  is_verified: action === "approve",
                  status: newStatus
                })
                .eq("id", entity_id);
          }
        }

        // Write audit log for each entity
        await supabase.from("entity_audit_logs").insert({
          entity_type: entity_type,
          entity_id: entity_id,
          action: `bulk_${action}`,
          actor_id: user.id,
          new_values: { status: statusMap[action] || action },
          metadata: { comment, bulk_operation: true },
        });

        updatedCount++;
      } catch (entityError: any) {
        console.error(`Error processing entity ${entity_id}:`, entityError);
        errors.push({ entity_id, error: entityError.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        updated_count: updatedCount,
        total_requested: entity_ids.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in admin_bulk_actions:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
