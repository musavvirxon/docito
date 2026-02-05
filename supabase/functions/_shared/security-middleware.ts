 /**
  * Security Middleware for Supabase Edge Functions
  * 
  * Provides centralized security controls including:
  * - Rate limiting
  * - Input validation
  * - Authentication verification
  * - Request logging
  * - Bot detection
  * 
  * OWASP Compliance:
  * - A1: Broken Access Control - Auth verification
  * - A2: Cryptographic Failures - Secure token handling
  * - A3: Injection - Input sanitization
  * - A4: Insecure Design - Defense in depth
  * - A5: Security Misconfiguration - Secure defaults
  * - A7: XSS - Output encoding
  */
 
 import { createClient, SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";
 import {
   RateLimitConfig,
   checkRateLimitMemory,
   rateLimitResponse,
   getClientIP,
   RATE_LIMIT_PRESETS,
 } from "./rate-limiter.ts";
 import {
   InputValidator,
   ValidationSchema,
   validationErrorResponse,
   escapeHtml,
 } from "./input-validator.ts";
 
 // ============= TYPES =============
 
 export interface SecurityContext {
   user: User | null;
   userId: string | null;
   ip: string;
   userAgent: string;
   roles: string[];
   isAuthenticated: boolean;
   supabase: SupabaseClient;
   serviceClient: SupabaseClient;
 }
 
 export interface SecurityConfig {
   // Rate limiting
   rateLimit?: RateLimitConfig | keyof typeof RATE_LIMIT_PRESETS;
   // Whether auth is required
   requireAuth?: boolean;
   // Required roles (any of these)
   requireRoles?: string[];
   // Allowed HTTP methods
   allowedMethods?: string[];
   // Skip bot detection
   skipBotDetection?: boolean;
   // Custom validation schema
   validationSchema?: ValidationSchema<any>;
   // Log all requests
   logRequests?: boolean;
 }
 
 export interface SecureHandlerResult {
   response?: Response;
   context?: SecurityContext;
   validatedBody?: unknown;
 }
 
 // ============= BOT DETECTION =============
 
 const SUSPICIOUS_USER_AGENTS = [
   /^$/,  // Empty user agent
   /curl/i,
   /wget/i,
   /python-requests/i,
   /python-urllib/i,
   /go-http-client/i,
   /java\//i,
   /libwww/i,
   /scrapy/i,
   /crawler/i,
   /spider/i,
   /bot(?!.*google|.*bing|.*yahoo|.*duckduck)/i, // Allow search engine bots
 ];
 
 const BLOCKED_IPS = new Set<string>(); // Populated dynamically
 const SUSPICIOUS_ACTIVITY = new Map<string, { count: number; lastSeen: number }>();
 
 /**
  * Basic bot detection
  */
 export function detectBot(req: Request): { isBot: boolean; reason?: string } {
   const userAgent = req.headers.get('user-agent') || '';
   const ip = getClientIP(req);
   
   // Check blocked IPs
   if (BLOCKED_IPS.has(ip)) {
     return { isBot: true, reason: 'blocked_ip' };
   }
   
   // Check suspicious user agents
   for (const pattern of SUSPICIOUS_USER_AGENTS) {
     if (pattern.test(userAgent)) {
       // Track suspicious activity
       trackSuspiciousActivity(ip);
       return { isBot: true, reason: 'suspicious_user_agent' };
     }
   }
   
   // Check for missing common headers (real browsers send these)
   const acceptLang = req.headers.get('accept-language');
   const accept = req.headers.get('accept');
   
   if (!acceptLang && !accept) {
     trackSuspiciousActivity(ip);
     // Don't block, just track
   }
   
   return { isBot: false };
 }
 
 function trackSuspiciousActivity(ip: string): void {
   const now = Date.now();
   const existing = SUSPICIOUS_ACTIVITY.get(ip);
   
   if (existing) {
     // Reset if last seen more than 1 hour ago
     if (now - existing.lastSeen > 3600000) {
       SUSPICIOUS_ACTIVITY.set(ip, { count: 1, lastSeen: now });
     } else {
       existing.count++;
       existing.lastSeen = now;
       
       // Auto-block after 50 suspicious requests
       if (existing.count >= 50) {
         BLOCKED_IPS.add(ip);
         console.warn(`Blocked IP due to suspicious activity: ${ip}`);
       }
     }
   } else {
     SUSPICIOUS_ACTIVITY.set(ip, { count: 1, lastSeen: now });
   }
 }
 
 // ============= CORS HEADERS =============
 
 export const corsHeaders: Record<string, string> = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
   'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
 };
 
 // ============= MAIN MIDDLEWARE =============
 
 /**
  * Secure handler wrapper - applies all security controls
  */
 export async function secureHandler(
   req: Request,
   endpoint: string,
   config: SecurityConfig = {}
 ): Promise<SecureHandlerResult> {
   
   // 1. Handle CORS preflight
   if (req.method === 'OPTIONS') {
     return { response: new Response('ok', { headers: corsHeaders }) };
   }
   
   // 2. Check allowed methods
   const allowedMethods = config.allowedMethods || ['GET', 'POST', 'PUT', 'DELETE'];
   if (!allowedMethods.includes(req.method)) {
     return {
       response: new Response(
         JSON.stringify({ error: 'Method not allowed' }),
         { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       ),
     };
   }
   
   // 3. Bot detection
   if (!config.skipBotDetection) {
     const botResult = detectBot(req);
     if (botResult.isBot) {
       console.warn(`Bot detected: ${botResult.reason}, IP: ${getClientIP(req)}`);
       return {
         response: new Response(
           JSON.stringify({ error: 'Access denied' }),
           { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         ),
       };
     }
   }
   
   // 4. Rate limiting
   const ip = getClientIP(req);
   let userId: string | null = null;
   
   if (config.rateLimit) {
     const rateLimitConfig = typeof config.rateLimit === 'string'
       ? RATE_LIMIT_PRESETS[config.rateLimit]
       : config.rateLimit;
     
     // Pre-auth rate limit (by IP only)
     const preAuthResult = checkRateLimitMemory(endpoint, ip, null, {
       ...rateLimitConfig,
       by: 'ip',
       maxRequests: rateLimitConfig.maxRequests * 2, // More lenient for IP-only
     });
     
     if (!preAuthResult.allowed) {
       console.warn(`Rate limit exceeded (pre-auth): IP=${ip}, endpoint=${endpoint}`);
       return { response: rateLimitResponse(preAuthResult, corsHeaders) };
     }
   }
   
   // 5. Initialize Supabase clients
   const supabaseUrl = Deno.env.get('SUPABASE_URL');
   const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
   const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
   
   if (!supabaseUrl || !anonKey || !serviceKey) {
     console.error('Missing Supabase environment variables');
     return {
       response: new Response(
         JSON.stringify({ error: 'Server configuration error' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       ),
     };
   }
   
   const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
   
   const supabase = createClient(supabaseUrl, anonKey, {
     global: { headers: authHeader ? { Authorization: authHeader } : {} },
     auth: { persistSession: false },
   });
   
   const serviceClient = createClient(supabaseUrl, serviceKey, {
     auth: { persistSession: false },
   });
   
   // 6. Authentication
   let user: User | null = null;
   let roles: string[] = [];
   
   if (authHeader) {
     const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
     
     if (!authError && authUser) {
       user = authUser;
       userId = authUser.id;
       
       // Fetch user roles
       const { data: userRoles } = await serviceClient
         .from('user_roles')
         .select('role')
         .eq('user_id', authUser.id);
       
       roles = userRoles?.map(r => r.role) || [];
     }
   }
   
   // Check auth requirement
   if (config.requireAuth && !user) {
     return {
       response: new Response(
         JSON.stringify({ error: 'Authentication required' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       ),
     };
   }
   
   // Check role requirement
   if (config.requireRoles && config.requireRoles.length > 0) {
     const hasRole = config.requireRoles.some(role => roles.includes(role));
     if (!hasRole) {
       return {
         response: new Response(
           JSON.stringify({ error: 'Insufficient permissions' }),
           { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         ),
       };
     }
   }
   
   // 7. Post-auth rate limiting (more accurate with user ID)
   if (config.rateLimit && userId) {
     const rateLimitConfig = typeof config.rateLimit === 'string'
       ? RATE_LIMIT_PRESETS[config.rateLimit]
       : config.rateLimit;
     
     const result = checkRateLimitMemory(endpoint, ip, userId, rateLimitConfig);
     
     if (!result.allowed) {
       console.warn(`Rate limit exceeded: IP=${ip}, user=${userId}, endpoint=${endpoint}`);
       return { response: rateLimitResponse(result, corsHeaders) };
     }
   }
   
   // 8. Input validation (for POST/PUT/PATCH)
   let validatedBody: unknown;
   
   if (['POST', 'PUT', 'PATCH'].includes(req.method) && config.validationSchema) {
     try {
       const body = await req.json();
       const validator = new InputValidator(config.validationSchema);
       const result = validator.validate(body);
       
       if (!result.valid) {
         return { response: validationErrorResponse(result.errors || [], corsHeaders) };
       }
       
       validatedBody = result.data;
     } catch (parseError) {
       return {
         response: new Response(
           JSON.stringify({ error: 'Invalid JSON body' }),
           { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         ),
       };
     }
   }
   
   // 9. Log request (if enabled)
   if (config.logRequests) {
     console.log(JSON.stringify({
       timestamp: new Date().toISOString(),
       endpoint,
       method: req.method,
       ip,
       userId,
       userAgent: req.headers.get('user-agent'),
     }));
   }
   
   // 10. Return security context
   const context: SecurityContext = {
     user,
     userId,
     ip,
     userAgent: req.headers.get('user-agent') || '',
     roles,
     isAuthenticated: !!user,
     supabase,
     serviceClient,
   };
   
   return { context, validatedBody };
 }
 
 // ============= RESPONSE HELPERS =============
 
 export function jsonResponse(
   data: unknown,
   status = 200,
   headers: Record<string, string> = {}
 ): Response {
   return new Response(JSON.stringify(data), {
     status,
     headers: { ...corsHeaders, 'Content-Type': 'application/json', ...headers },
   });
 }
 
 export function errorResponse(
   message: string,
   status = 400,
   code?: string
 ): Response {
   return jsonResponse({ error: message, code }, status);
 }
 
 /**
  * Safely escape user input for logging
  */
 export function safeLog(message: string, data: Record<string, unknown>): void {
   const sanitized: Record<string, unknown> = {};
   
   for (const [key, value] of Object.entries(data)) {
     if (typeof value === 'string') {
       // Escape and truncate
       sanitized[key] = escapeHtml(value.slice(0, 200));
     } else if (typeof value === 'number' || typeof value === 'boolean') {
       sanitized[key] = value;
     } else {
       sanitized[key] = '[redacted]';
     }
   }
   
   console.log(message, JSON.stringify(sanitized));
 }