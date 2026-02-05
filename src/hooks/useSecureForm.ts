 /**
  * Secure Form Hook
  * 
  * Provides integrated rate limiting, input validation, and
  * spam protection for forms.
  * 
  * Usage:
  * ```tsx
  * const { 
  *   isSubmitting, 
  *   isRateLimited, 
  *   submitSecurely,
  *   validateField 
  * } = useSecureForm({
  *   formId: 'contact-form',
  *   rateLimit: { maxRequests: 3, windowMs: 60000 },
  * });
  * 
  * const handleSubmit = async (data) => {
  *   const result = await submitSecurely(async () => {
  *     // Your API call
  *     await supabase.from('contacts').insert(data);
  *   });
  *   if (!result.success) {
  *     toast.error(result.error);
  *   }
  * };
  * ```
  */
 
 import { useState, useCallback, useRef } from 'react';
 import { useToast } from '@/hooks/use-toast';
 import {
   checkClientRateLimit,
   getRemainingRequests,
   RATE_LIMIT_PRESETS,
   type RateLimitConfig,
   validateTextField,
   validateEmailField,
   validatePhoneField,
   type ValidationResult,
 } from '@/lib/security';
 
 interface UseSecureFormOptions {
   /** Unique identifier for this form (for rate limiting) */
   formId: string;
   /** Rate limit configuration */
   rateLimit?: RateLimitConfig;
   /** Show toast on rate limit */
   showRateLimitToast?: boolean;
   /** Minimum time between submissions (ms) - prevents double-clicks */
   debounceMs?: number;
 }
 
 interface SubmitResult {
   success: boolean;
   error?: string;
   data?: unknown;
 }
 
 export function useSecureForm(options: UseSecureFormOptions) {
   const {
     formId,
     rateLimit = RATE_LIMIT_PRESETS.form,
     showRateLimitToast = true,
     debounceMs = 1000,
   } = options;
   
   const { toast } = useToast();
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [isRateLimited, setIsRateLimited] = useState(false);
   const lastSubmitRef = useRef<number>(0);
   
   /**
    * Check if form can be submitted
    */
   const canSubmit = useCallback((): boolean => {
     // Check debounce
     const now = Date.now();
     if (now - lastSubmitRef.current < debounceMs) {
       return false;
     }
     
     // Check rate limit
     if (!checkClientRateLimit(formId, rateLimit)) {
       setIsRateLimited(true);
       if (showRateLimitToast) {
         toast({
           title: 'Too many attempts',
           description: 'Please wait a moment before trying again.',
           variant: 'destructive',
         });
       }
       return false;
     }
     
     setIsRateLimited(false);
     return true;
   }, [formId, rateLimit, debounceMs, showRateLimitToast, toast]);
   
   /**
    * Execute a form submission with security checks
    */
   const submitSecurely = useCallback(async <T>(
     submitFn: () => Promise<T>
   ): Promise<SubmitResult> => {
     // Pre-submission checks
     if (!canSubmit()) {
       return { success: false, error: 'Please wait before submitting again' };
     }
     
     if (isSubmitting) {
       return { success: false, error: 'Submission in progress' };
     }
     
     setIsSubmitting(true);
     lastSubmitRef.current = Date.now();
     
     try {
       const result = await submitFn();
       return { success: true, data: result };
     } catch (error: any) {
       // Handle rate limit from server
       if (error?.status === 429 || error?.message?.includes('rate limit')) {
         setIsRateLimited(true);
         return { 
           success: false, 
           error: 'Too many requests. Please try again later.' 
         };
       }
       
       return { 
         success: false, 
         error: error?.message || 'An error occurred' 
       };
     } finally {
       setIsSubmitting(false);
     }
   }, [canSubmit, isSubmitting]);
   
   /**
    * Get remaining submissions
    */
   const remainingSubmissions = useCallback((): number => {
     return getRemainingRequests(formId, rateLimit);
   }, [formId, rateLimit]);
   
   /**
    * Validate a text field
    */
   const validateText = useCallback((
     value: unknown,
     fieldName: string,
     options?: Parameters<typeof validateTextField>[2]
   ): ValidationResult => {
     return validateTextField(value, fieldName, options);
   }, []);
   
   /**
    * Validate an email field
    */
   const validateEmail = useCallback((
     value: unknown,
     fieldName = 'Email',
     required = true
   ): ValidationResult => {
     return validateEmailField(value, fieldName, required);
   }, []);
   
   /**
    * Validate a phone field
    */
   const validatePhone = useCallback((
     value: unknown,
     fieldName = 'Phone',
     required = true
   ): ValidationResult => {
     return validatePhoneField(value, fieldName, required);
   }, []);
   
   return {
     isSubmitting,
     isRateLimited,
     canSubmit,
     submitSecurely,
     remainingSubmissions,
     validateText,
     validateEmail,
     validatePhone,
   };
 }