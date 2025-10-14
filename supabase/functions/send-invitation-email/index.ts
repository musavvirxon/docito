import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  to: string;
  inviteeName: string;
  clinicName: string;
  role: string;
  inviterName: string;
  customMessage?: string;
  inviteToken: string;
  isExistingUser: boolean;
  platformUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      to,
      inviteeName,
      clinicName,
      role,
      inviterName,
      customMessage,
      inviteToken,
      isExistingUser,
      platformUrl,
    }: InvitationEmailRequest = await req.json();

    const acceptLink = isExistingUser
      ? `${platformUrl}/dashboard?invitation=${inviteToken}`
      : `${platformUrl}/sign-up?invitation=${inviteToken}`;

    const emailHtml = isExistingUser
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px;">
            Invitation to Join ${clinicName}
          </h1>
          
          <p>Hi ${inviteeName},</p>
          
          <p><strong>${inviterName}</strong> from <strong>${clinicName}</strong> has invited you to join their practice as a <strong>${role}</strong>.</p>
          
          ${customMessage ? `<div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
            <p style="margin: 0; font-style: italic;">"${customMessage}"</p>
          </div>` : ''}
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${acceptLink}" 
               style="background-color: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This invitation will expire in 7 days. If you don't want to join, you can safely ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <span style="color: #0ea5e9;">${acceptLink}</span>
          </p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px;">
            Welcome to ${clinicName}
          </h1>
          
          <p>Hi ${inviteeName || 'there'},</p>
          
          <p><strong>${inviterName}</strong> from <strong>${clinicName}</strong> has invited you to join their practice as a <strong>${role}</strong>.</p>
          
          ${customMessage ? `<div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
            <p style="margin: 0; font-style: italic;">"${customMessage}"</p>
          </div>` : ''}
          
          <p>To accept this invitation, you'll need to create an account first.</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${acceptLink}" 
               style="background-color: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Create Account & Join ${clinicName}
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This invitation will expire in 7 days.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <span style="color: #0ea5e9;">${acceptLink}</span>
          </p>
        </div>
      `;

    const emailResponse = await resend.emails.send({
      from: "Practice Invitations <onboarding@resend.dev>",
      to: [to],
      subject: `Invitation to join ${clinicName}`,
      html: emailHtml,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);