 /**
  * Rate Limiter for Supabase Edge Functions
  * 
  * Implements token bucket algorithm with IP + user-based limiting.
  * Uses Supabase table for distributed rate limiting across function invocations.
  * 
  * OWASP Best Practices:
  * - Protects against brute force attacks
  * - Prevents resource exhaustion
  * - Graceful degradation with 429 responses
  */
 
 import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 // ============= TYPES =============
 
 export interface RateLimitConfig {
   // Maximum requests allowed in the window
   maxRequests: number;
   // Time window in seconds
   windowSeconds: number;
   // Identifier type: 'ip', 'user', or 'both'
   by: 'ip' | 'user' | 'both';
   // Optional: different limits for authenticated users
   authenticatedMultiplier?: number;
   // Optional: skip rate limiting for certain roles
   skipRoles?: string[];
 }
 
 export interface RateLimitResult {
   allowed: boolean;
   remaining: number;
   resetAt: Date;
   retryAfter?: number; // seconds until reset
 }
 
 // ============= DEFAULT CONFIGS =============
 
 export const RATE_LIMIT_PRESETS = {
   // For general API endpoints
   standard: {
     maxRequests: 100,
     windowSeconds: 60,
     by: 'both' as const,
     authenticatedMultiplier: 2,
   },
   // For sensitive operations (login, signup, password reset)
   auth: {
     maxRequests: 5,
     windowSeconds: 60,
     by: 'ip' as const,
   },
   // For form submissions (feedback, contact forms)
   form: {
     maxRequests: 10,
     windowSeconds: 300,
     by: 'both' as const,
     authenticatedMultiplier: 2,
   },
   // For resource-intensive operations
   expensive: {
     maxRequests: 20,
     windowSeconds: 300,
     by: 'both' as const,
   },
   // For booking operations
   booking: {
     maxRequests: 30,
     windowSeconds: 300,
     by: 'user' as const,
   },
   // For email/SMS sending
   messaging: {
     maxRequests: 10,
     windowSeconds: 3600,
     by: 'both' as const,
   },
   // Strict limits for spam-prone endpoints
   strict: {
     maxRequests: 5,
     windowSeconds: 300,
     by: 'ip' as const,
   },
 } as const;
 
 // ============= UTILITIES =============
 
 /**
  * Extract client IP from request headers
  * Handles various proxy configurations
  */
 export function getClientIP(req: Request): string {
   // Check standard forwarding headers in order of preference
   const forwardedFor = req.headers.get('x-forwarded-for');
   if (forwardedFor) {
     // Take the first IP (original client)
     const firstIP = forwardedFor.split(',')[0].trim();
     if (isValidIP(firstIP)) return firstIP;
   }
   
   const realIP = req.headers.get('x-real-ip');
   if (realIP && isValidIP(realIP)) return realIP;
   
   const cfIP = req.headers.get('cf-connecting-ip');
   if (cfIP && isValidIP(cfIP)) return cfIP;
   
   // Fallback - should rarely happen in production
   return 'unknown';
 }
 
 /**
  * Basic IP address validation
  */
 function isValidIP(ip: string): boolean {
   // IPv4 pattern
   const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
   // IPv6 pattern (simplified)
   const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$/;
   
   return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === '::1';
 }
 
 /**
  * Generate a unique rate limit key
  */
 function generateKey(
   endpoint: string,
   ip: string,
   userId: string | null,
   by: RateLimitConfig['by']
 ): string {
   const parts = [endpoint];
   
   if (by === 'ip' || by === 'both') {
     parts.push(`ip:${ip}`);
   }
   
   if ((by === 'user' || by === 'both') && userId) {
     parts.push(`user:${userId}`);
   } else if (by === 'user' && !userId) {
     // For user-only limiting, fall back to IP for anonymous
     parts.push(`ip:${ip}`);
   }
   
   return parts.join(':');
 }
 
 // ============= IN-MEMORY RATE LIMITER =============
 // For edge functions without persistent storage
 
 const memoryStore = new Map<string, { count: number; resetAt: number }>();
 
 /**
  * Simple in-memory rate limiter
  * Note: This resets on function cold starts but is fast
  */
 export function checkRateLimitMemory(
   endpoint: string,
   ip: string,
   userId: string | null,
   config: RateLimitConfig
 ): RateLimitResult {
   const key = generateKey(endpoint, ip, userId, config.by);
   const now = Date.now();
   const windowMs = config.windowSeconds * 1000;
   
   let maxReqs = config.maxRequests;
   if (userId && config.authenticatedMultiplier) {
     maxReqs = Math.floor(maxReqs * config.authenticatedMultiplier);
   }
   
   const existing = memoryStore.get(key);
   
   if (!existing || now > existing.resetAt) {
     // New window
     const resetAt = now + windowMs;
     memoryStore.set(key, { count: 1, resetAt });
     return {
       allowed: true,
       remaining: maxReqs - 1,
       resetAt: new Date(resetAt),
     };
   }
   
   if (existing.count >= maxReqs) {
     const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
     return {
       allowed: false,
       remaining: 0,
       resetAt: new Date(existing.resetAt),
       retryAfter,
     };
   }
   
   existing.count++;
   return {
     allowed: true,
     remaining: maxReqs - existing.count,
     resetAt: new Date(existing.resetAt),
   };
 }
 
 // ============= DATABASE RATE LIMITER =============
 // For persistent rate limiting across function invocations
 
 /**
  * Database-backed rate limiter using Supabase
  * Requires 'rate_limits' table to exist
  */
 export async function checkRateLimitDB(
   supabase: SupabaseClient,
   endpoint: string,
   ip: string,
   userId: string | null,
   config: RateLimitConfig
 ): Promise<RateLimitResult> {
   const key = generateKey(endpoint, ip, userId, config.by);
   const now = new Date();
   const windowMs = config.windowSeconds * 1000;
   const windowStart = new Date(now.getTime() - windowMs);
   
   let maxReqs = config.maxRequests;
   if (userId && config.authenticatedMultiplier) {
     maxReqs = Math.floor(maxReqs * config.authenticatedMultiplier);
   }
   
   try {
     // Count requests in current window
     const { count, error } = await supabase
       .from('rate_limits')
       .select('*', { count: 'exact', head: true })
       .eq('key', key)
       .gte('created_at', windowStart.toISOString());
     
     if (error) {
       console.error('Rate limit DB error:', error);
       // Fail open - allow request but log warning
       return {
         allowed: true,
         remaining: maxReqs,
         resetAt: new Date(now.getTime() + windowMs),
       };
     }
     
     const currentCount = count || 0;
     
     if (currentCount >= maxReqs) {
       const retryAfter = Math.ceil(windowMs / 1000);
       return {
         allowed: false,
         remaining: 0,
         resetAt: new Date(now.getTime() + windowMs),
         retryAfter,
       };
     }
     
     // Record this request
     await supabase.from('rate_limits').insert({
       key,
       endpoint,
       ip_address: ip,
       user_id: userId,
       created_at: now.toISOString(),
     });
     
     return {
       allowed: true,
       remaining: maxReqs - currentCount - 1,
       resetAt: new Date(now.getTime() + windowMs),
     };
   } catch (error) {
     console.error('Rate limit check failed:', error);
     // Fail open
     return {
       allowed: true,
       remaining: maxReqs,
       resetAt: new Date(now.getTime() + windowMs),
     };
   }
 }
 
 // ============= RATE LIMIT RESPONSE =============
 
 /**
  * Create a standardized 429 Too Many Requests response
  */
 export function rateLimitResponse(
   result: RateLimitResult,
   corsHeaders: Record<string, string>
 ): Response {
   return new Response(
     JSON.stringify({
       error: 'Too many requests',
       message: 'You have exceeded the rate limit. Please try again later.',
       retryAfter: result.retryAfter,
       resetAt: result.resetAt.toISOString(),
     }),
     {
       status: 429,
       headers: {
         ...corsHeaders,
         'Content-Type': 'application/json',
         'Retry-After': String(result.retryAfter || 60),
         'X-RateLimit-Remaining': '0',
         'X-RateLimit-Reset': result.resetAt.toISOString(),
       },
     }
   );
 }
 
 // ============= CLEANUP =============
 
 /**
  * Clean up expired rate limit entries from memory
  */
 export function cleanupMemoryStore(): void {
   const now = Date.now();
   for (const [key, value] of memoryStore.entries()) {
     if (now > value.resetAt) {
       memoryStore.delete(key);
     }
   }
 }
 
 // Run cleanup every 5 minutes
 setInterval(cleanupMemoryStore, 5 * 60 * 1000);