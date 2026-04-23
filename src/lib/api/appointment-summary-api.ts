import { supabase } from '@/integrations/supabase/client';

interface DownloadOptions {
  displayCurrency?: string;
  language?: string;
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
      display_currency: options.displayCurrency,
      language: options.language,
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

  // Trigger browser download
  const link = document.createElement('a');
  link.href = url;
  link.download = `appointment-summary-${appointmentId.slice(0, 8)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { blob, url };
}
