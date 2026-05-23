import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'insurance' | 'other';

export interface RecordPaymentInput {
  appointmentId?: string | null;
  patientId: string;
  patientName?: string | null;
  doctorId?: string | null;
  practiceId?: string | null;
  amount: number;          // amount being recorded NOW
  amountDue?: number;      // total amount expected for this item (full price)
  paymentMethod: PaymentMethod;
  invoiceNumber: string;
  serviceName?: string | null;
  notes?: string;
  paidAt?: string;
  invoiceId?: string | null; // attach to an existing invoice if known
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
      const realAppointmentId =
        input.appointmentId && !/^(tph|ap)-/.test(input.appointmentId) ? input.appointmentId : null;

      const amountDue = Math.max(Number(input.amountDue || input.amount || 0), 0);
      const amountPaid = Math.max(Number(input.amount || 0), 0);
      if (amountPaid <= 0) {
        toast.error('Amount must be greater than zero');
        return { success: false, error: 'Invalid amount' };
      }

      const isFullyPaid = amountDue > 0 && amountPaid >= amountDue - 0.0001;
      const paymentStatus = isFullyPaid ? 'paid' : 'partial';

      // 1) Ensure an invoice exists for this charge so partial payments accumulate cleanly
      let invoiceId = input.invoiceId || null;
      try {
        if (!invoiceId) {
          // Determine the owning entity for the invoice
          const entityType = input.practiceId ? 'practice' : 'doctor';
          const entityId = input.practiceId || input.doctorId || null;
          if (entityId) {
            const dueCents = Math.round(amountDue * 100);
            const lineItem = {
              description: input.serviceName || 'Service',
              quantity: 1,
              unit_amount: dueCents,
              amount: dueCents,
            };
            const { data: created, error: invErr } = await (supabase as any)
              .from('billing_invoices')
              .insert({
                entity_type: entityType,
                entity_id: entityId,
                patient_id: input.patientId,
                doctor_id: input.doctorId ?? null,
                appointment_id: realAppointmentId,
                invoice_number: input.invoiceNumber,
                status: 'pending',
                currency: 'usd',
                amount_due_cents: dueCents,
                amount_paid_cents: 0,
                amount_remaining_cents: dueCents,
                description: input.serviceName || input.notes || 'Medical services',
                line_items: [lineItem],
                metadata: {
                  patient_name: input.patientName || null,
                  service_name: input.serviceName || null,
                  invoice_number: input.invoiceNumber,
                },
                created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
              })
              .select('id')
              .single();
            if (!invErr && created?.id) invoiceId = created.id;
          }
        }
      } catch (e) {
        console.warn('invoice upsert skipped', e);
      }

      const payload = {
        appointment_id: realAppointmentId,
        patient_id: input.patientId,
        doctor_id: input.doctorId ?? null,
        practice_id: input.practiceId ?? null,
        amount: amountPaid,
        amount_due: amountDue || amountPaid,
        invoice_id: invoiceId,
        status: paymentStatus,
        payment_method: input.paymentMethod,
        transaction_id: input.invoiceNumber,
        notes: input.notes ?? null,
        paid_at: input.paidAt ?? new Date().toISOString(),
      };

      const { data, error } = await supabase.from('payments').insert(payload).select().single();
      if (error) throw error;

      toast.success(isFullyPaid ? 'Payment recorded' : 'Partial payment recorded');
      return { success: true, data, invoiceId };
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
