 /**
  * Client-side Rate Limiting Utilities
  * 
  * Provides local rate limiting to prevent accidental spam
  * and reduce server load. This is NOT a security boundary -
  * server-side rate limiting is always required.
  */
 
 interface RateLimitEntry {
   count: number;
   resetAt: number;
 }
 
 const rateLimitStore = new Map<string, RateLimitEntry>();
 
 export interface RateLimitConfig {
   maxRequests: number;
   windowMs: number;
 }
 
 export const RATE_LIMIT_PRESETS = {
   // Form submissions
   form: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
   // Button clicks
   button: { maxRequests: 5, windowMs: 5000 }, // 5 per 5 seconds
   // API calls
   api: { maxRequests: 30, windowMs: 60000 }, // 30 per minute
   // Search/filter
   search: { maxRequests: 20, windowMs: 10000 }, // 20 per 10 seconds
   // Expensive operations
   expensive: { maxRequests: 5, windowMs: 60000 }, // 5 per minute
 } as const;
 
 /**
  * Check if an action is rate limited
  * Returns true if the action is allowed, false if rate limited
  */
 export function checkClientRateLimit(
   action: string,
   config: RateLimitConfig = RATE_LIMIT_PRESETS.api
 ): boolean {
   const now = Date.now();
   const existing = rateLimitStore.get(action);
   
   if (!existing || now > existing.resetAt) {
     // New window
     rateLimitStore.set(action, {
       count: 1,
       resetAt: now + config.windowMs,
     });
     return true;
   }
   
   if (existing.count >= config.maxRequests) {
     return false;
   }
   
   existing.count++;
   return true;
 }
 
 /**
  * Get remaining requests for an action
  */
 export function getRemainingRequests(
   action: string,
   config: RateLimitConfig = RATE_LIMIT_PRESETS.api
 ): number {
   const now = Date.now();
   const existing = rateLimitStore.get(action);
   
   if (!existing || now > existing.resetAt) {
     return config.maxRequests;
   }
   
   return Math.max(0, config.maxRequests - existing.count);
 }
 
 /**
  * Reset rate limit for an action (use carefully)
  */
 export function resetRateLimit(action: string): void {
   rateLimitStore.delete(action);
 }
 
 /**
  * Clean up expired entries
  */
 export function cleanupRateLimits(): void {
   const now = Date.now();
   for (const [key, value] of rateLimitStore.entries()) {
     if (now > value.resetAt) {
       rateLimitStore.delete(key);
     }
   }
 }
 
 // Auto-cleanup every 5 minutes
 if (typeof window !== 'undefined') {
   setInterval(cleanupRateLimits, 5 * 60 * 1000);
 }