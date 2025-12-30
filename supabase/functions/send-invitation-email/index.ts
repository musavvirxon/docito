import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  to: string;
  inviteeName: string;
  clinicName: string;
  inviterName: string;
  inviteUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { to, inviteeName, clinicName, inviterName, inviteUrl } =
      (await req.json()) as InvitationEmailRequest;

    if (!to || !inviteUrl) {
      return new Response(JSON.stringify({ error: "Missing to/inviteUrl" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const subject = `You're invited to join ${clinicName}`;
    const html = `
      <div style="font-family:Arial,sans-serif; line-height:1.5">
        <h2>Invitation to join ${clinicName}</h2>
        <p>Hi ${inviteeName || "there"},</p>
        <p>${inviterName || "A clinic admin"} invited you to join <b>${clinicName}</b>.</p>
        <p>
          <a href="${inviteUrl}" style="display:inline-block; padding:10px 14px; background:#2563eb; color:#fff; border-radius:6px; text-decoration:none;">
            Accept Invitation
          </a>
        </p>
        <p>If the button doesn't work, copy/paste:</p>
        <p>${inviteUrl}</p>
      </div>
    `;

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Practice Invitations <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    const resultText = await resendResp.text();
    if (!resendResp.ok) {
      console.error("Resend error:", resultText);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resultText }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(JSON.stringify({ success: true, result: resultText }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
