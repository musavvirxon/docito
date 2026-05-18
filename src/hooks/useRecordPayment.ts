import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'insurance' | 'other';

export interface RecordPaymentInput {
  appointmentId?: string | null;
  patientId: string;
  doctorId?: string | null;
  practiceId?: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
  invoiceNumber: string;
  notes?: string;
  paidAt?: string;
}

export const generateInvoiceNumber = () => {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${ymd}-${rand}`;
};

export const useRecordPayment = () => {
  const [submitting, setSubmitting] = useState(false);

  const recordPayment = async (input: RecordPaymentInput) => {
    setSubmitting(true);
    try {
      // Synthetic ids prefixed with `tph-` / `ap-` in pending list are not real appointment ids
      const realAppointmentId =
        input.appointmentId && !/^(tph|ap)-/.test(input.appointmentId) ? input.appointmentId : null;

      const payload = {
        appointment_id: realAppointmentId,
        patient_id: input.patientId,
        doctor_id: input.doctorId ?? null,
        practice_id: input.practiceId ?? null,
        amount: input.amount,
        status: 'paid',
        payment_method: input.paymentMethod,
        transaction_id: input.invoiceNumber,
        notes: input.notes ?? null,
        paid_at: input.paidAt ?? new Date().toISOString(),
      };

      const { data, error } = await supabase.from('payments').insert(payload).select().single();
      if (error) throw error;

      toast.success('Payment recorded');
      return { success: true, data };
    } catch (err: any) {
      console.error('recordPayment error', err);
      toast.error(err.message || 'Failed to record payment');
      return { success: false, error: err.message };
    } finally {
      setSubmitting(false);
    }
  };

  return { recordPayment, submitting };
};
