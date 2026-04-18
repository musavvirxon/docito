// Invoice PDF download — locale follows the UI language.
import { supabase } from '@/integrations/supabase/client';
import i18n from '@/i18n/config';

const SUPPORTED_LOCALES = new Set([
  'en', 'ru', 'uz', 'tr', 'ar', 'ja', 'ko', 'zh', 'es', 'pt', 'de',
]);

function resolveLocale(explicit?: string): string {
  const raw = (explicit || i18n.language || (typeof navigator !== 'undefined' ? navigator.language : 'en') || 'en')
    .toString()
    .toLowerCase()
    .trim();
  const code = raw.split(/[-_]/)[0];
  return SUPPORTED_LOCALES.has(code) ? code : 'en';
}

export async function downloadInvoicePdf(invoiceId: string, fileName?: string, locale?: string): Promise<void> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://gswwpjdtgsxzcsnrxutu.supabase.co';
  const anonKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzd3dwamR0Z3N4emNzbnJ4dXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTI4MTUsImV4cCI6MjA3MzM2ODgxNX0.YEjg25_0LlzWQoh-SIk-kq_mxcvUoyhODSQ__4DJfSw';

  const effectiveLocale = resolveLocale(locale);

  const res = await fetch(`${supabaseUrl}/functions/v1/invoice-generate-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': anonKey,
      'Accept': 'application/pdf',
    },
    body: JSON.stringify({ invoice_id: invoiceId, locale: effectiveLocale }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`PDF generation failed (${res.status}): ${errText}`);
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `${(fileName || `invoice-${invoiceId.slice(0, 8)}`).replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}
