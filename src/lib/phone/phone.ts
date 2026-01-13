export type PhoneValidationResult = {
  ok: boolean;
  normalized: string; // +<digits>
  reason?: string;
};

/**
 * Normalize to +<digits> best-effort.
 * Accepts "+1 415 555 2671", "1-415-555-2671", "0044 20 7183 8750" etc.
 */
export function normalizePhone(raw: string): string {
  const input = (raw || "").trim();
  if (!input) return "";

  // Convert leading 00 international prefix to +
  let s = input.startsWith("00") ? `+${input.slice(2)}` : input;

  // Remove all non-digits, preserve leading +
  const hasPlus = s.startsWith("+");
  const digits = s.replace(/\D/g, "");
  if (!digits) return "";

  return hasPlus ? `+${digits}` : `+${digits}`;
}

/**
 * E.164 validation (global):
 * - must start with +
 * - 10..15 digits (country code + national number)
 * NOTE: Operator/carrier name requires paid lookup API; offline validation can't provide carrier names globally.
 */
export function validatePhone(raw: string): PhoneValidationResult {
  const normalized = normalizePhone(raw);

  if (!normalized) return { ok: false, normalized: "", reason: "Phone number is required" };
  if (!normalized.startsWith("+")) return { ok: false, normalized, reason: "Phone must start with +" };

  const digits = normalized.slice(1);
  if (!/^\d+$/.test(digits)) return { ok: false, normalized, reason: "Phone contains invalid characters" };

  // E.164 max 15 digits, min commonly 10 total digits including country code
  if (digits.length < 10 || digits.length > 15) {
    return { ok: false, normalized, reason: "Phone must have 10–15 digits including country code" };
  }

  // country calling codes cannot start with 0 (per E.164)
  if (digits.startsWith("0")) {
    return { ok: false, normalized, reason: "Country code cannot start with 0" };
  }

  return { ok: true, normalized };
}

export function formatPhone(rawOrNormalized: string): string {
  // Keep it simple without external deps; return normalized with spaces every few digits (optional)
  const n = normalizePhone(rawOrNormalized);
  if (!n) return "";
  return n;
}

export function phonePlaceholder(): string {
  return "+1 415 555 2671";
}
