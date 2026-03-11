// Prescription PDF download
import { supabase } from '@/integrations/supabase/client';

export async function downloadPrescriptionPdf(prescriptionId: string, prescriptionNumber?: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('prescription-generate-pdf', {
    body: { prescription_id: prescriptionId },
  });

  if (error) throw error;
  if (!data) throw new Error('No PDF data received');

  const blob = data instanceof Blob ? data : new Blob([JSON.stringify(data)], { type: 'application/pdf' });
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
  const { data, error } = await supabase.functions.invoke('patient-profile-generate-pdf', {
    body: { patient_id: patientId },
  });

  if (error) throw error;
  if (!data) throw new Error('No PDF data received');

  const blob = data instanceof Blob ? data : new Blob([JSON.stringify(data)], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `patient-profile-${(patientName || patientId.slice(0, 8)).replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}
