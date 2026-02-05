 /**
  * Security Utilities Index
  * 
  * Centralized exports for all client-side security utilities.
  * Import from this file for convenience.
  */
 
 // Input sanitization and validation
 export {
   escapeHtml,
   sanitizeString,
   sanitizeEmail,
   sanitizePhone,
   sanitizeUrl,
   PATTERNS,
   MAX_LENGTHS,
   isValidEmail,
   isValidPhone,
   isValidUUID,
   isValidUrl,
   containsXss,
   validateTextField,
   validateEmailField,
   validatePhoneField,
   type ValidationResult,
 } from './inputSanitizer';
 
 // Rate limiting
 export {
   checkClientRateLimit,
   getRemainingRequests,
   resetRateLimit,
   cleanupRateLimits,
   RATE_LIMIT_PRESETS,
   type RateLimitConfig,
 } from './rateLimitClient';