import { supabase } from '@/integrations/supabase/client';

export type BillingPaymentMethod = 'cash' | 'card' | 'insurance' | 'bank_transfer' | 'other';

export interface RecordBillingPaymentInput {
  /** Amount in major units (e.g. 25.50) */
  amount: number;
  method: BillingPaymentMethod;
  notes?: string | null;
  appointmentId?: string | null;
  patientId?: string | null;
  doctorId?: string | null;
  practiceId?: string | null;
  /** When set, the payment is applied to this charge only. Otherwise FIFO across unpaid charges. */
  chargeId?: string | null;
}

export interface BillingPaymentAllocation {
  charge_id: string;
  description: string | null;
  amount_cents: number;
}

export interface RecordBillingPaymentResult {
  paymentId: string | null;
  allocations: BillingPaymentAllocation[];
  unallocatedCents: number;
}

/**
 * Records a payment through the `record_billing_payment` RPC.
 * The RPC authorizes the caller, allocates the amount oldest-charge-first
 * (or to a single charge), writes the payment history row and posts the
 * matching finance ledger income entry.
 */
export async function recordBillingPayment(
  input: RecordBillingPaymentInput,
): Promise<RecordBillingPaymentResult> {
  const cents = Math.round(Number(input.amount) * 100);
  if (!Number.isFinite(cents) || cents <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  const { data, error } = await (supabase as any).rpc('record_billing_payment', {
    p_amount_cents: cents,
    p_method: input.method,
    p_notes: input.notes ?? null,
    p_appointment_id: input.appointmentId ?? null,
    p_patient_id: input.patientId ?? null,
    p_doctor_id: input.doctorId ?? null,
    p_practice_id: input.practiceId ?? null,
    p_charge_id: input.chargeId ?? null,
  });

  if (error) throw error;

  const res = (data || {}) as any;
  return {
    paymentId: res.payment_id ?? null,
    allocations: Array.isArray(res.allocations) ? res.allocations : [],
    unallocatedCents: Number(res.unallocated_cents) || 0,
  };
}

/** Remaining (unpaid) amount in major units for a billing charge row. */
export function chargeRemaining(row: any): number {
  const total = row?.amount_cents != null ? Number(row.amount_cents) : Number(row?.amount || 0) * 100;
  const paid = Number(row?.paid_cents || 0);
  return Math.max(0, (total - paid) / 100);
}

/** Amount already settled against a billing charge row, in major units. */
export function chargePaid(row: any): number {
  return Math.max(0, Number(row?.paid_cents || 0) / 100);
}
