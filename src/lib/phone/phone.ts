// src/lib/phone/phone.ts
import { parsePhoneNumberFromString, getCountryCallingCode } from 'libphonenumber-js';

export type PhoneValidationResult = {
  ok: boolean;
  normalized: string; // E.164 format if ok, else best-effort
  reason?: string;
  country?: string;   // ISO country code, e.g. "US", "GB", "UZ"
  callingCode?: string; // e.g. "1", "44", "998"
  type?: string;      // "MOBILE" | "FIXED_LINE" | "FIXED_LINE_OR_MOBILE" | etc (when available)
};

/**
 * Normalize phone to E.164 when possible.
 * Accepts:
 *  - "+14155552671"
 *  - "+44 20 7183 8750"
 *  - "14155552671" (will be treated as +14155552671 if it parses)
 *  - local numbers only if defaultCountry provided
 */
export function normalizePhone(raw: string, defaultCountry?: string): string {
  const input = (raw || '').trim();
  if (!input) return '';

  // If it doesn't start with +, try parsing anyway; libphonenumber-js can parse with defaultCountry
  const phone = parsePhoneNumberFromString(input, defaultCountry as any);
  if (!phone) {
    // fallback: keep only digits and prefix +
    const digits = input.replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }

  // format to E.164
  return phone.number; // already E.164
}

/**
 * Strict validation using libphonenumber-js metadata:
 * - must be possible + valid
 * - returns normalized E.164
 * - tries to infer country + calling code + number type (mobile/fixed)
 */
export function validatePhone(raw: string, defaultCountry?: string): PhoneValidationResult {
  const input = (raw || '').trim();
  if (!input) {
    return { ok: false, normalized: '', reason: 'Phone number is required' };
  }

  const phone = parsePhoneNumberFromString(input, defaultCountry as any);

  if (!phone) {
    return { ok: false, normalized: normalizePhone(raw, defaultCountry), reason: 'Invalid phone number' };
  }

  // "isPossible" checks length; "isValid" checks country/carrier patterns when known
  if (!phone.isPossible()) {
    return {
      ok: false,
      normalized: phone.number,
      reason: 'Phone number length is not possible for its country code',
      country: phone.country || undefined,
      callingCode: phone.countryCallingCode,
    };
  }

  if (!phone.isValid()) {
    return {
      ok: false,
      normalized: phone.number,
      reason: 'Phone number is not valid for its country/carrier format',
      country: phone.country || undefined,
      callingCode: phone.countryCallingCode,
    };
  }

  // phone.getType() works if you installed metadata that supports it
  let type: string | undefined;
  try {
    type = (phone as any).getType?.();
  } catch {
    type = undefined;
  }

  return {
    ok: true,
    normalized: phone.number, // E.164
    country: phone.country || undefined,
    callingCode: phone.countryCallingCode,
    type,
  };
}

/**
 * Display formatting:
 * - returns INTERNATIONAL format where possible
 * - fallback returns raw normalized
 */
export function formatPhone(normalizedOrRaw: string, defaultCountry?: string): string {
  const input = (normalizedOrRaw || '').trim();
  if (!input) return '';

  const phone = parsePhoneNumberFromString(input, defaultCountry as any);
  if (!phone) return input;

  // Nice international formatting (+1 415 555 2671)
  return phone.formatInternational();
}

/**
 * Optional helper for UI: build placeholder by country.
 * If you don't know country, use a generic +1 example.
 */
export function phonePlaceholder(country?: string): string {
  if (!country) return '+1 415 555 2671';

  // Very small map of common examples; still "international", not Uzbekistan-specific.
  // You can add more if you want, but not required.
  const c = country.toUpperCase();
  const examples: Record<string, string> = {
    US: '+1 415 555 2671',
    GB: '+44 20 7183 8750',
    DE: '+49 30 901820',
    FR: '+33 1 42 68 53 00',
    IN: '+91 98765 43210',
    AE: '+971 50 123 4567',
    SA: '+966 50 123 4567',
    TR: '+90 532 123 4567',
    RU: '+7 916 123 45 67',
    KZ: '+7 701 123 45 67',
  };

  return examples[c] || '+1 415 555 2671';
}

/**
 * Optional helper: get calling code from ISO country.
 */
export function callingCodeFor(country: string): string {
  return getCountryCallingCode(country as any);
}
