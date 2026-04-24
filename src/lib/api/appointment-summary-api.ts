import { supabase } from '@/integrations/supabase/client';
import i18n from '@/i18n/config';

interface DownloadOptions {
  displayCurrency?: string;
  language?: string;
  fileName?: string;
}

function resolveDisplayCurrency(explicit?: string): string | undefined {
  if (explicit) return explicit;
  if (typeof window !== 'undefined') {
    try {
      const pref = window.localStorage.getItem('preferred_currency');
      if (pref) return pref;
    } catch {
      /* noop */
    }
  }
  return undefined;
}

function resolveLanguage(explicit?: string): string {
  return (explicit || i18n.language || 'en').toString().toLowerCase().split(/[-_]/)[0];
}

/**
 * Download (and trigger save in browser) the appointment summary PDF.
 * Returns a Blob URL so callers can preview if needed.
 */
export async function downloadAppointmentSummaryPdf(
  appointmentId: string,
  options: DownloadOptions = {},
): Promise<{ blob: Blob; url: string }> {
  const { data, error } = await supabase.functions.invoke('appointment-summary-pdf', {
    body: {
      appointment_id: appointmentId,
      display_currency: resolveDisplayCurrency(options.displayCurrency),
      language: resolveLanguage(options.language),
    },
  });

  if (error) throw error;

  // Edge function returns base64 PDF in JSON for SDK compatibility
  const base64 = (data as any)?.pdf_base64;
  if (!base64) throw new Error('Empty PDF response');

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const fileName = (options.fileName || `appointment-summary-${appointmentId.slice(0, 8)}`)
    .replace(/[^\w.\-]+/g, '_')
    .slice(0, 120);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { blob, url };
}
