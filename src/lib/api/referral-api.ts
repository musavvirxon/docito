// File: src/lib/api/referral-api.ts
import { supabase } from '@/integrations/supabase/client';

type DownloadReferralPdfArgs = {
  referralId: string;
  /**
   * Optional locale override.
   * If omitted, we try to infer it from common dashboard settings (i18next/localStorage).
   */
  locale?: string;
  /** Optional file name (without .pdf) */
  fileName?: string;
};

function safeLocalStorageGet(key: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function inferDashboardLocale(): string {
  // Common keys used by i18next/react-i18next
  const fromI18n = safeLocalStorageGet('i18nextLng');
  const fromDocito = safeLocalStorageGet('docito:locale') || safeLocalStorageGet('docito_locale');
  const nav = typeof navigator !== 'undefined' ? navigator.language : '';
  return sanitizeLocale(fromDocito || fromI18n || nav || 'en');
}

function sanitizeLocale(input: string): string {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return 'en';

  // Accept full locale forms (e.g. en-US) and map to supported languages.
  const code = raw.split(/[-_]/)[0];
  switch (code) {
    case 'en':
    case 'ru':
    case 'uz':
    case 'tr':
    case 'ar':
    case 'ja':
    case 'ko':
    case 'zh':
    case 'es':
    case 'pt':
    case 'de':
      return code;
    default:
      return 'en';
  }
}

export async function downloadReferralPdf({ referralId, locale, fileName }: DownloadReferralPdfArgs) {
  const effectiveLocale = sanitizeLocale(locale || inferDashboardLocale());

  const { data, error } = await supabase.functions.invoke('referral-generate-pdf', {
    body: {
      referral_id: referralId,
      locale: effectiveLocale,
    },
    responseType: 'blob',
  });

  if (error) throw error;
  if (!data) throw new Error('No PDF data received');

  const blobUrl = URL.createObjectURL(data as Blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `${(fileName || `referral_${referralId.slice(0, 8)}`).replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 2000);
}
