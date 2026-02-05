 /**
  * Send Invitation Email Edge Function
  * 
  * Security features:
  * - Rate limiting: 10 emails per hour per user
  * - Input validation with strict schema
  * - XSS protection via HTML escaping
  * - Authentication required with doctor/admin role
  * - URL validation to prevent injection
  */
 
 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import {
   secureHandler,
   jsonResponse,
   errorResponse,
   corsHeaders,
 } from "../_shared/security-middleware.ts";
 import {
   escapeHtml,
   sanitizeString,
   sanitizeEmail,
   sanitizeUrl,
   validateEmail,
   validateUrl,
   MAX_LENGTHS,
 } from "../_shared/input-validator.ts";
 
 // ============= VALIDATION SCHEMA =============
 
 const invitationSchema = {
   to: {
     type: 'email' as const,
     required: true,
     maxLength: MAX_LENGTHS.email,
   },
   inviteeName: {
     type: 'string' as const,
     required: false,
     maxLength: MAX_LENGTHS.name,
     sanitize: true,
   },
   clinicName: {
     type: 'string' as const,
     required: true,
     minLength: 1,
     maxLength: MAX_LENGTHS.name,
     sanitize: true,
   },
   inviterName: {
     type: 'string' as const,
     required: false,
     maxLength: MAX_LENGTHS.name,
     sanitize: true,
   },
   inviteUrl: {
     type: 'url' as const,
     required: true,
     maxLength: MAX_LENGTHS.url,
   },
 };
 
 // ============= HANDLER =============
 
 serve(async (req) => {
   // Apply security middleware with rate limiting
   const { response, context, validatedBody } = await secureHandler(req, 'send-invitation-email', {
     rateLimit: 'messaging', // 10 requests per hour
     requireAuth: true,
     requireRoles: ['doctor', 'admin', 'super_admin', 'clinic_admin'],
     allowedMethods: ['POST', 'OPTIONS'],
     validationSchema: invitationSchema,
     logRequests: true,
   });
   
   // Return early if middleware returned a response
   if (response) return response;
   if (!context || !validatedBody) {
     return errorResponse('Internal server error', 500);
   }
   
   try {
     const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
     if (!RESEND_API_KEY) {
       console.error("Missing RESEND_API_KEY");
       return errorResponse("Email service not configured", 500);
     }
     
     const { user, ip } = context;
     const body = validatedBody as Record<string, unknown>;
     
     // Validate and sanitize email
     const toEmail = validateEmail(body.to);
     if (!toEmail) {
       return errorResponse("Invalid email address", 400);
     }
     
     // Validate and sanitize URL
     const inviteUrl = validateUrl(body.inviteUrl);
     if (!inviteUrl) {
       return errorResponse("Invalid invite URL", 400);
     }
     
     // Additional URL security: only allow specific domains
     try {
       const urlObj = new URL(inviteUrl);
       const allowedHosts = [
         'localhost',
         '127.0.0.1',
         'lovable.app',
         'docito.lovable.app',
       ];
       
       const isAllowedHost = allowedHosts.some(host => 
         urlObj.hostname === host || urlObj.hostname.endsWith('.' + host)
       );
       
       if (!isAllowedHost && !urlObj.hostname.endsWith('.lovable.app')) {
         console.warn(`Blocked invitation to suspicious URL: ${urlObj.hostname}`);
         return errorResponse("Invalid invite URL domain", 400);
       }
     } catch {
       return errorResponse("Invalid invite URL", 400);
     }
     
     // Escape all user-provided strings for HTML email
     const safeInviteeName = escapeHtml(sanitizeString(String(body.inviteeName || 'there'), MAX_LENGTHS.name));
     const safeClinicName = escapeHtml(sanitizeString(String(body.clinicName || ''), MAX_LENGTHS.name));
     const safeInviterName = escapeHtml(sanitizeString(String(body.inviterName || 'A clinic admin'), MAX_LENGTHS.name));
     const safeInviteUrl = escapeHtml(inviteUrl);
     
     const subject = `You're invited to join ${safeClinicName}`;
     const html = `
       <div style="font-family:Arial,sans-serif; line-height:1.5">
         <h2>Invitation to join ${safeClinicName}</h2>
         <p>Hi ${safeInviteeName},</p>
         <p>${safeInviterName} invited you to join <b>${safeClinicName}</b>.</p>
         <p>
           <a href="${safeInviteUrl}" style="display:inline-block; padding:10px 14px; background:#2563eb; color:#fff; border-radius:6px; text-decoration:none;">
             Accept Invitation
           </a>
         </p>
         <p>If the button doesn't work, copy/paste:</p>
         <p>${safeInviteUrl}</p>
         <hr style="margin:20px 0; border:none; border-top:1px solid #e5e7eb;">
         <p style="font-size:12px; color:#6b7280;">
           This invitation was sent by an authorized administrator.
           If you didn't expect this email, you can safely ignore it.
         </p>
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
         to: [toEmail],
         subject,
         html,
       }),
     });
     
     const resultText = await resendResp.text();
     
     if (!resendResp.ok) {
       console.error("Resend error:", resultText);
       return errorResponse("Failed to send email", 500);
     }
     
     console.log(`Invitation email sent: to=${toEmail}, clinic=${body.clinicName}, by=${user?.id}, ip=${ip}`);
     
     return jsonResponse({ success: true });
   } catch (error: any) {
     console.error("Error sending invitation email:", error);
     return errorResponse("Failed to send email", 500);
   }
 });
