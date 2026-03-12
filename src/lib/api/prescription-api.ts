// Prescription PDF download
import { supabase } from '@/integrations/supabase/client';

export async function downloadPrescriptionPdf(prescriptionId: string, prescriptionNumber?: string): Promise<void> {
  // Use raw fetch for reliable binary PDF response
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://gswwpjdtgsxzcsnrxutu.supabase.co';
  const anonKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzd3dwamR0Z3N4emNzbnJ4dXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTI4MTUsImV4cCI6MjA3MzM2ODgxNX0.YEjg25_0LlzWQoh-SIk-kq_mxcvUoyhODSQ__4DJfSw';

  const res = await fetch(`${supabaseUrl}/functions/v1/prescription-generate-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': anonKey,
      'Accept': 'application/pdf',
    },
    body: JSON.stringify({ prescription_id: prescriptionId }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`PDF generation failed (${res.status}): ${errText}`);
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `prescription-${(prescriptionNumber || prescriptionId.slice(0, 8)).replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}

export async function downloadPatientProfilePdf(patientId: string, patientName?: string): Promise<void> {
  const { generateProfilePatientPDF } = await import('@/components/doctor/patients/PatientSummaryPDF');
  await generateProfilePatientPDF(patientId, '');
}
