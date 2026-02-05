 /**
  * Client-side Input Sanitization Utilities
  * 
  * OWASP Best Practices:
  * - Defense in depth: sanitize on client AND server
  * - Prevent XSS through proper escaping
  * - Validate input types and lengths
  * 
  * NOTE: Server-side validation is ALWAYS required.
  * Client-side validation improves UX but is not a security boundary.
  */
 
 // ============= HTML ESCAPING =============
 
 /**
  * Escape HTML special characters to prevent XSS
  */
 export function escapeHtml(str: string): string {
   const htmlEscapes: Record<string, string> = {
     '&': '&amp;',
     '<': '&lt;',
     '>': '&gt;',
     '"': '&quot;',
     "'": '&#x27;',
     '/': '&#x2F;',
     '`': '&#x60;',
     '=': '&#x3D;',
   };
   
   return str.replace(/[&<>"'`=/]/g, (char) => htmlEscapes[char] || char);
 }
 
 // ============= STRING SANITIZATION =============
 
 /**
  * Sanitize a string for safe use
  * - Trims whitespace
  * - Removes control characters
  * - Limits length
  */
 export function sanitizeString(str: unknown, maxLength = 10000): string {
   if (typeof str !== 'string') return '';
   
   let sanitized = str.trim();
   
   // Limit length
   if (sanitized.length > maxLength) {
     sanitized = sanitized.slice(0, maxLength);
   }
   
   // Remove null bytes and control characters (keep newlines/tabs)
   sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
   
   return sanitized;
 }
 
 /**
  * Sanitize email - lowercase and trim
  */
 export function sanitizeEmail(email: unknown): string {
   if (typeof email !== 'string') return '';
   return email.trim().toLowerCase().slice(0, 254);
 }
 
 /**
  * Sanitize phone number - keep only valid characters
  */
 export function sanitizePhone(phone: unknown): string {
   if (typeof phone !== 'string') return '';
   return phone.replace(/[^\d+\-\s()]/g, '').trim().slice(0, 20);
 }
 
 /**
  * Sanitize URL - validate and return clean URL or empty string
  */
 export function sanitizeUrl(url: unknown): string {
   if (typeof url !== 'string') return '';
   
   try {
     const parsed = new URL(url.trim());
     // Only allow http/https
     if (!['http:', 'https:'].includes(parsed.protocol)) {
       return '';
     }
     return parsed.toString().slice(0, 2048);
   } catch {
     return '';
   }
 }
 
 // ============= VALIDATION PATTERNS =============
 
 export const PATTERNS = {
   email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
   phone: /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/,
   uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
   url: /^https?:\/\/.+/i,
   // No script tags, event handlers, or javascript: URLs
   noXss: /^(?!.*(<script|javascript:|on\w+=|<iframe|<object|<embed)).*$/i,
 } as const;
 
 // ============= LENGTH LIMITS =============
 
 export const MAX_LENGTHS = {
   name: 100,
   email: 254,
   phone: 20,
   title: 200,
   description: 2000,
   message: 5000,
   notes: 10000,
   url: 2048,
   address: 500,
   shortText: 100,
   mediumText: 500,
   longText: 2000,
 } as const;
 
 // ============= VALIDATION FUNCTIONS =============
 
 export function isValidEmail(email: unknown): boolean {
   if (typeof email !== 'string') return false;
   const cleaned = email.trim().toLowerCase();
   return PATTERNS.email.test(cleaned) && cleaned.length <= MAX_LENGTHS.email;
 }
 
 export function isValidPhone(phone: unknown): boolean {
   if (typeof phone !== 'string') return false;
   const cleaned = sanitizePhone(phone);
   return PATTERNS.phone.test(cleaned) && cleaned.length >= 7;
 }
 
 export function isValidUUID(uuid: unknown): boolean {
   if (typeof uuid !== 'string') return false;
   return PATTERNS.uuid.test(uuid.trim());
 }
 
 export function isValidUrl(url: unknown): boolean {
   if (typeof url !== 'string') return false;
   try {
     const parsed = new URL(url.trim());
     return ['http:', 'https:'].includes(parsed.protocol);
   } catch {
     return false;
   }
 }
 
 /**
  * Check if string contains potential XSS
  */
 export function containsXss(str: unknown): boolean {
   if (typeof str !== 'string') return false;
   return !PATTERNS.noXss.test(str);
 }
 
 // ============= FORM FIELD VALIDATION =============
 
 export interface ValidationResult {
   valid: boolean;
   error?: string;
   sanitized?: string;
 }
 
 export function validateTextField(
   value: unknown,
   fieldName: string,
   options: {
     required?: boolean;
     minLength?: number;
     maxLength?: number;
     noXss?: boolean;
   } = {}
 ): ValidationResult {
   const { required = false, minLength = 0, maxLength = MAX_LENGTHS.longText, noXss = true } = options;
   
   if (value === undefined || value === null || value === '') {
     if (required) {
       return { valid: false, error: `${fieldName} is required` };
     }
     return { valid: true, sanitized: '' };
   }
   
   if (typeof value !== 'string') {
     return { valid: false, error: `${fieldName} must be text` };
   }
   
   const sanitized = sanitizeString(value, maxLength);
   
   if (sanitized.length < minLength) {
     return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
   }
   
   if (sanitized.length > maxLength) {
     return { valid: false, error: `${fieldName} must be at most ${maxLength} characters` };
   }
   
   if (noXss && containsXss(sanitized)) {
     return { valid: false, error: `${fieldName} contains invalid characters` };
   }
   
   return { valid: true, sanitized };
 }
 
 export function validateEmailField(
   value: unknown,
   fieldName: string,
   required = true
 ): ValidationResult {
   if (value === undefined || value === null || value === '') {
     if (required) {
       return { valid: false, error: `${fieldName} is required` };
     }
     return { valid: true, sanitized: '' };
   }
   
   const sanitized = sanitizeEmail(value);
   
   if (!isValidEmail(sanitized)) {
     return { valid: false, error: `Please enter a valid ${fieldName.toLowerCase()}` };
   }
   
   return { valid: true, sanitized };
 }
 
 export function validatePhoneField(
   value: unknown,
   fieldName: string,
   required = true
 ): ValidationResult {
   if (value === undefined || value === null || value === '') {
     if (required) {
       return { valid: false, error: `${fieldName} is required` };
     }
     return { valid: true, sanitized: '' };
   }
   
   const sanitized = sanitizePhone(value);
   
   if (!isValidPhone(sanitized)) {
     return { valid: false, error: `Please enter a valid ${fieldName.toLowerCase()}` };
   }
   
   return { valid: true, sanitized };
 }