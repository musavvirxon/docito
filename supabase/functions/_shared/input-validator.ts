 /**
  * Input Validation & Sanitization Utilities
  * 
  * OWASP Best Practices:
  * - Schema-based validation with strict type checking
  * - Length limits to prevent buffer overflows
  * - HTML/SQL injection prevention through sanitization
  * - Reject unexpected fields to prevent mass assignment
  */
 
 // ============= TYPES =============
 
 export interface ValidationResult<T> {
   valid: boolean;
   data?: T;
   errors?: ValidationError[];
 }
 
 export interface ValidationError {
   field: string;
   message: string;
   code: string;
 }
 
 export interface FieldRule {
   type: 'string' | 'number' | 'boolean' | 'email' | 'phone' | 'url' | 'uuid' | 'date' | 'array' | 'object';
   required?: boolean;
   minLength?: number;
   maxLength?: number;
   min?: number;
   max?: number;
   pattern?: RegExp;
   enum?: readonly string[];
   sanitize?: boolean;
   trim?: boolean;
   items?: FieldRule; // For arrays
   properties?: Record<string, FieldRule>; // For objects
 }
 
 export type ValidationSchema<T> = {
   [K in keyof T]: FieldRule;
 };
 
 // ============= SANITIZATION =============
 
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
 
 /**
  * Remove potential SQL injection characters
  * Note: Always use parameterized queries - this is an extra layer
  */
 export function sanitizeSql(str: string): string {
   // Remove or escape dangerous characters
   return str
     .replace(/'/g, "''") // Escape single quotes
     .replace(/--/g, '') // Remove comment markers
     .replace(/;/g, '') // Remove statement terminators
     .replace(/\/\*/g, '') // Remove block comment start
     .replace(/\*\//g, ''); // Remove block comment end
 }
 
 /**
  * Sanitize a string for safe storage and display
  */
 export function sanitizeString(str: string, maxLength = 10000): string {
   if (typeof str !== 'string') return '';
   
   // Trim whitespace
   let sanitized = str.trim();
   
   // Limit length
   if (sanitized.length > maxLength) {
     sanitized = sanitized.slice(0, maxLength);
   }
   
   // Remove null bytes and other control characters (except newlines/tabs)
   sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
   
   return sanitized;
 }
 
 /**
  * Sanitize email address
  */
 export function sanitizeEmail(email: string): string {
   return email.trim().toLowerCase().slice(0, 254);
 }
 
 /**
  * Sanitize phone number - keep only digits and +
  */
 export function sanitizePhone(phone: string): string {
   return phone.replace(/[^\d+\-\s()]/g, '').trim().slice(0, 20);
 }
 
 /**
  * Sanitize URL
  */
 export function sanitizeUrl(url: string): string {
   try {
     const parsed = new URL(url.trim());
     // Only allow http/https protocols
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
   date: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/,
   alphanumeric: /^[a-zA-Z0-9]+$/,
   slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
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
   extraLongText: 10000,
 } as const;
 
 // ============= VALIDATOR CLASS =============
 
 export class InputValidator<T extends Record<string, unknown>> {
   private schema: ValidationSchema<T>;
   private allowExtraFields: boolean;
   
   constructor(schema: ValidationSchema<T>, options?: { allowExtraFields?: boolean }) {
     this.schema = schema;
     this.allowExtraFields = options?.allowExtraFields ?? false;
   }
   
   /**
    * Validate and sanitize input data
    */
   validate(data: unknown): ValidationResult<T> {
     const errors: ValidationError[] = [];
     const validated: Partial<T> = {};
     
     if (typeof data !== 'object' || data === null) {
       return {
         valid: false,
         errors: [{ field: '_root', message: 'Input must be an object', code: 'INVALID_TYPE' }],
       };
     }
     
     const inputData = data as Record<string, unknown>;
     
     // Check for unexpected fields
     if (!this.allowExtraFields) {
       const schemaKeys = new Set(Object.keys(this.schema));
       const inputKeys = Object.keys(inputData);
       
       for (const key of inputKeys) {
         if (!schemaKeys.has(key)) {
           errors.push({
             field: key,
             message: `Unexpected field: ${key}`,
             code: 'UNEXPECTED_FIELD',
           });
         }
       }
     }
     
     // Validate each field in schema
     for (const [field, rule] of Object.entries(this.schema) as [keyof T, FieldRule][]) {
       const value = inputData[field as string];
       const fieldErrors = this.validateField(String(field), value, rule);
       
       if (fieldErrors.length > 0) {
         errors.push(...fieldErrors);
       } else if (value !== undefined) {
         validated[field] = this.processValue(value, rule) as T[keyof T];
       }
     }
     
     if (errors.length > 0) {
       return { valid: false, errors };
     }
     
     return { valid: true, data: validated as T };
   }
   
   private validateField(field: string, value: unknown, rule: FieldRule): ValidationError[] {
     const errors: ValidationError[] = [];
     
     // Check required
     if (rule.required && (value === undefined || value === null || value === '')) {
       errors.push({ field, message: `${field} is required`, code: 'REQUIRED' });
       return errors;
     }
     
     // Skip further validation if not required and empty
     if (value === undefined || value === null || value === '') {
       return errors;
     }
     
     // Type validation
     switch (rule.type) {
       case 'string':
         if (typeof value !== 'string') {
           errors.push({ field, message: `${field} must be a string`, code: 'INVALID_TYPE' });
           return errors;
         }
         if (rule.minLength && value.length < rule.minLength) {
           errors.push({ field, message: `${field} must be at least ${rule.minLength} characters`, code: 'TOO_SHORT' });
         }
         if (rule.maxLength && value.length > rule.maxLength) {
           errors.push({ field, message: `${field} must be at most ${rule.maxLength} characters`, code: 'TOO_LONG' });
         }
         if (rule.pattern && !rule.pattern.test(value)) {
           errors.push({ field, message: `${field} has invalid format`, code: 'INVALID_FORMAT' });
         }
         if (rule.enum && !rule.enum.includes(value)) {
           errors.push({ field, message: `${field} must be one of: ${rule.enum.join(', ')}`, code: 'INVALID_ENUM' });
         }
         break;
         
       case 'number':
         const num = typeof value === 'string' ? parseFloat(value) : value;
         if (typeof num !== 'number' || isNaN(num)) {
           errors.push({ field, message: `${field} must be a number`, code: 'INVALID_TYPE' });
           return errors;
         }
         if (rule.min !== undefined && num < rule.min) {
           errors.push({ field, message: `${field} must be at least ${rule.min}`, code: 'TOO_SMALL' });
         }
         if (rule.max !== undefined && num > rule.max) {
           errors.push({ field, message: `${field} must be at most ${rule.max}`, code: 'TOO_LARGE' });
         }
         break;
         
       case 'boolean':
         if (typeof value !== 'boolean') {
           errors.push({ field, message: `${field} must be a boolean`, code: 'INVALID_TYPE' });
         }
         break;
         
       case 'email':
         if (typeof value !== 'string' || !PATTERNS.email.test(value)) {
           errors.push({ field, message: `${field} must be a valid email`, code: 'INVALID_EMAIL' });
         }
         break;
         
       case 'phone':
         if (typeof value !== 'string' || !PATTERNS.phone.test(value)) {
           errors.push({ field, message: `${field} must be a valid phone number`, code: 'INVALID_PHONE' });
         }
         break;
         
       case 'url':
         if (typeof value !== 'string' || !PATTERNS.url.test(value)) {
           errors.push({ field, message: `${field} must be a valid URL`, code: 'INVALID_URL' });
         }
         break;
         
       case 'uuid':
         if (typeof value !== 'string' || !PATTERNS.uuid.test(value)) {
           errors.push({ field, message: `${field} must be a valid UUID`, code: 'INVALID_UUID' });
         }
         break;
         
       case 'date':
         if (typeof value !== 'string' || !PATTERNS.date.test(value)) {
           errors.push({ field, message: `${field} must be a valid date`, code: 'INVALID_DATE' });
         }
         break;
         
       case 'array':
         if (!Array.isArray(value)) {
           errors.push({ field, message: `${field} must be an array`, code: 'INVALID_TYPE' });
           return errors;
         }
         if (rule.minLength && value.length < rule.minLength) {
           errors.push({ field, message: `${field} must have at least ${rule.minLength} items`, code: 'TOO_SHORT' });
         }
         if (rule.maxLength && value.length > rule.maxLength) {
           errors.push({ field, message: `${field} must have at most ${rule.maxLength} items`, code: 'TOO_LONG' });
         }
         break;
         
       case 'object':
         if (typeof value !== 'object' || value === null || Array.isArray(value)) {
           errors.push({ field, message: `${field} must be an object`, code: 'INVALID_TYPE' });
         }
         break;
     }
     
     return errors;
   }
   
   private processValue(value: unknown, rule: FieldRule): unknown {
     if (value === null || value === undefined) return value;
     
     if (rule.type === 'string' && typeof value === 'string') {
       let processed = value;
       
       if (rule.trim !== false) {
         processed = processed.trim();
       }
       
       if (rule.sanitize !== false) {
         processed = sanitizeString(processed, rule.maxLength);
       }
       
       return processed;
     }
     
     if (rule.type === 'email' && typeof value === 'string') {
       return sanitizeEmail(value);
     }
     
     if (rule.type === 'phone' && typeof value === 'string') {
       return sanitizePhone(value);
     }
     
     if (rule.type === 'url' && typeof value === 'string') {
       return sanitizeUrl(value);
     }
     
     if (rule.type === 'number') {
       return typeof value === 'string' ? parseFloat(value) : value;
     }
     
     return value;
   }
 }
 
 // ============= QUICK VALIDATORS =============
 
 export function validateEmail(email: unknown): string | null {
   if (typeof email !== 'string') return null;
   const cleaned = email.trim().toLowerCase();
   if (!PATTERNS.email.test(cleaned) || cleaned.length > MAX_LENGTHS.email) return null;
   return cleaned;
 }
 
 export function validatePhone(phone: unknown): string | null {
   if (typeof phone !== 'string') return null;
   const cleaned = sanitizePhone(phone);
   if (!PATTERNS.phone.test(cleaned)) return null;
   return cleaned;
 }
 
 export function validateUUID(uuid: unknown): string | null {
   if (typeof uuid !== 'string') return null;
   const cleaned = uuid.trim().toLowerCase();
   if (!PATTERNS.uuid.test(cleaned)) return null;
   return cleaned;
 }
 
 export function validateUrl(url: unknown): string | null {
   if (typeof url !== 'string') return null;
   return sanitizeUrl(url) || null;
 }
 
 export function validateString(
   value: unknown,
   minLength = 0,
   maxLength = MAX_LENGTHS.longText
 ): string | null {
   if (typeof value !== 'string') return null;
   const cleaned = sanitizeString(value, maxLength);
   if (cleaned.length < minLength) return null;
   return cleaned;
 }
 
 // ============= RESPONSE HELPERS =============
 
 export function validationErrorResponse(
   errors: ValidationError[],
   corsHeaders: Record<string, string>
 ): Response {
   return new Response(
     JSON.stringify({
       error: 'Validation failed',
       details: errors,
     }),
     {
       status: 400,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     }
   );
 }