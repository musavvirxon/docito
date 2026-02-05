 /**
  * Submit Feedback Edge Function
  * 
  * Security features:
  * - Rate limiting: 10 requests per 5 minutes per user
  * - Input validation with strict schema
  * - XSS protection via sanitization
  * - Authentication required
  */
 
 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
 import {
   secureHandler,
   jsonResponse,
   errorResponse,
   corsHeaders,
 } from "../_shared/security-middleware.ts";
 import {
   InputValidator,
   escapeHtml,
   sanitizeString,
   sanitizeUrl,
   MAX_LENGTHS,
 } from "../_shared/input-validator.ts";
 
 // ============= VALIDATION SCHEMA =============
 
 const FEEDBACK_TYPES = ["bug", "feature", "other"] as const;
 const SEVERITY_LEVELS = ["low", "medium", "high"] as const;
 
 const feedbackSchema = {
   type: {
     type: 'string' as const,
     required: true,
     enum: FEEDBACK_TYPES,
   },
   severity: {
     type: 'string' as const,
     required: true,
     enum: SEVERITY_LEVELS,
   },
   title: {
     type: 'string' as const,
     required: true,
     minLength: 4,
     maxLength: MAX_LENGTHS.title,
     sanitize: true,
   },
   message: {
     type: 'string' as const,
     required: true,
     minLength: 10,
     maxLength: MAX_LENGTHS.message,
     sanitize: true,
   },
   steps: {
     type: 'string' as const,
     required: false,
     maxLength: MAX_LENGTHS.longText,
     sanitize: true,
   },
   expected: {
     type: 'string' as const,
     required: false,
     maxLength: MAX_LENGTHS.longText,
     sanitize: true,
   },
   actual: {
     type: 'string' as const,
     required: false,
     maxLength: MAX_LENGTHS.longText,
     sanitize: true,
   },
   page_url: {
     type: 'string' as const,
     required: false,
     maxLength: MAX_LENGTHS.url,
   },
   role: {
     type: 'string' as const,
     required: false,
     maxLength: MAX_LENGTHS.shortText,
     sanitize: true,
   },
   roles: {
     type: 'object' as const,
     required: false,
   },
   user_email: {
     type: 'string' as const,
     required: false,
     maxLength: MAX_LENGTHS.email,
   },
   user_name: {
     type: 'string' as const,
     required: false,
     maxLength: MAX_LENGTHS.name,
     sanitize: true,
   },
   app_version: {
     type: 'string' as const,
     required: false,
     maxLength: 50,
     sanitize: true,
   },
   user_agent: {
     type: 'string' as const,
     required: false,
     maxLength: 500,
     sanitize: true,
   },
   metadata: {
     type: 'object' as const,
     required: false,
   },
 };
 
 // ============= HANDLER =============
 
 serve(async (req) => {
   // Apply security middleware with rate limiting and validation
   const { response, context, validatedBody } = await secureHandler(req, 'submit-feedback', {
     rateLimit: 'form', // 10 requests per 5 minutes
     requireAuth: true,
     allowedMethods: ['POST', 'OPTIONS'],
     validationSchema: feedbackSchema,
     logRequests: true,
   });
   
   // Return early if middleware returned a response (error/rate limit)
   if (response) return response;
   if (!context || !validatedBody) {
     return errorResponse('Internal server error', 500);
   }
   
   try {
     const { serviceClient, user, ip } = context;
     const body = validatedBody as Record<string, unknown>;
     
     // Additional sanitization for user-provided content
     const sanitizedData = {
       user_id: user!.id,
       type: body.type,
       severity: body.severity,
       title: escapeHtml(sanitizeString(String(body.title), MAX_LENGTHS.title)),
       message: escapeHtml(sanitizeString(String(body.message), MAX_LENGTHS.message)),
       steps: body.steps ? escapeHtml(sanitizeString(String(body.steps), MAX_LENGTHS.longText)) : null,
       expected: body.expected ? escapeHtml(sanitizeString(String(body.expected), MAX_LENGTHS.longText)) : null,
       actual: body.actual ? escapeHtml(sanitizeString(String(body.actual), MAX_LENGTHS.longText)) : null,
       page_url: body.page_url ? sanitizeUrl(String(body.page_url)) : null,
       role: body.role ? sanitizeString(String(body.role), MAX_LENGTHS.shortText) : null,
       roles: body.roles ?? null,
       user_email: body.user_email ? sanitizeString(String(body.user_email), MAX_LENGTHS.email) : null,
       user_name: body.user_name ? escapeHtml(sanitizeString(String(body.user_name), MAX_LENGTHS.name)) : null,
       app_version: body.app_version ? sanitizeString(String(body.app_version), 50) : null,
       user_agent: body.user_agent ? sanitizeString(String(body.user_agent), 500) : null,
       metadata: (body.metadata && typeof body.metadata === 'object') ? body.metadata : {},
       // Security metadata
       submitted_from_ip: ip,
     };
     
     const { error: insertErr } = await serviceClient.from("feedback").insert(sanitizedData);
     
     if (insertErr) {
       console.error('Feedback insert error:', insertErr);
       return errorResponse('Failed to submit feedback', 400);
     }
     
     console.log(`Feedback submitted: user=${user!.id}, type=${body.type}, severity=${body.severity}`);
     
     return jsonResponse({ ok: true });
   } catch (e) {
     console.error('Submit feedback error:', e);
     return errorResponse('Internal server error', 500);
   }
 });
