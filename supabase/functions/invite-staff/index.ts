import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteStaffRequest {
  entity_id: string;
  email: string;
  role: string;
  entity_type?: "clinic" | "pharmacy" | "lab" | "imaging";
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

    const { entity_id, email, role, entity_type = "clinic" } =
      (await req.json()) as InviteStaffRequest;

    // Validate input
    if (!entity_id || !email || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: entity_id, email, role" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is entity admin or super admin
    let isAdmin = false;
    
    // Check super admin role
    const { data: superAdminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (superAdminRole) {
      isAdmin = true;
    }

    // Check entity admin based on entity type
    if (!isAdmin) {
      let adminCheck;
      switch (entity_type) {
        case "pharmacy":
          adminCheck = await supabase
            .from("pharmacies")
            .select("admin_id")
            .eq("id", entity_id)
            .eq("admin_id", user.id)
            .maybeSingle();
          break;
        case "lab":
          adminCheck = await supabase
            .from("lab_centers")
            .select("admin_id")
            .eq("id", entity_id)
            .eq("admin_id", user.id)
            .maybeSingle();
          break;
        case "imaging":
          adminCheck = await supabase
            .from("imaging_centers")
            .select("admin_id")
            .eq("id", entity_id)
            .eq("admin_id", user.id)
            .maybeSingle();
          break;
        default: // clinic
          adminCheck = await supabase
            .from("practices")
            .select("admin_id")
            .eq("id", entity_id)
            .eq("admin_id", user.id)
            .maybeSingle();
      }
      
      if (adminCheck?.data) {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: only entity admins can invite staff" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate invite token
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invite record
    const { data: invite, error: inviteError } = await supabase
      .from("staff_invitations")
      .insert({
        entity_id,
        entity_type,
        email,
        role,
        invited_by: user.id,
        token: inviteToken,
        expires_at: expiresAt.toISOString(),
        status: "pending",
      })
      .select()
      .single();

    if (inviteError) {
      // Check if invitation already exists
      if (inviteError.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Invitation already sent to this email" }),
          { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      throw inviteError;
    }

    // Write audit log
    await supabase.from("entity_audit_logs").insert({
      entity_type: "staff_invitation",
      entity_id: invite.id,
      action: "invite_sent",
      actor_id: user.id,
      new_values: { email, role, entity_type },
    });

    // Send invitation email (if configured)
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      try {
        const inviteUrl = `${Deno.env.get("FRONTEND_URL") || "https://docito.app"}/accept-invite/${inviteToken}`;
        
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Staff Invitations <onboarding@resend.dev>",
            to: [email],
            subject: `You're invited to join as ${role}`,
            html: `
              <div style="font-family:Arial,sans-serif; line-height:1.5">
                <h2>Staff Invitation</h2>
                <p>You've been invited to join as a ${role}.</p>
                <p>
                  <a href="${inviteUrl}" style="display:inline-block; padding:10px 14px; background:#2563eb; color:#fff; border-radius:6px; text-decoration:none;">
                    Accept Invitation
                  </a>
                </p>
                <p>This invitation expires in 7 days.</p>
              </div>
            `,
          }),
        });
      } catch (emailError) {
        console.error("Failed to send invitation email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return new Response(
      JSON.stringify({ 
        invite_id: invite.id,
        status: "pending",
        expires_at: expiresAt.toISOString()
      }),
      { status: 201, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in invite_staff:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
