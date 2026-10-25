import { supabase } from '@/integrations/supabase/client';

/** Keep clinical procedure options owner-scoped, regardless of price or bookability. */
export function ownActiveProcedures<T extends { dentist_id: string; is_active: boolean | null }>(
  procedures: T[],
  doctorId: string,
): T[] {
  return procedures.filter((procedure) =>
    procedure.dentist_id === doctorId && procedure.is_active !== false,
  );
}

/** Tell every open procedure picker (treatment plans, sessions, booking) to reload now. */
export function notifyProceduresChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('doctor-procedures-changed'));
  }
}

export type PublicDoctorProcedure = {
  id: string;
  dentist_id: string;
  name: string;
  description: string | null;
  category: string | null;
  type: string | null;
  default_cost: number | null;
  price: number | null;
  currency: string | null;
  duration_minutes: number | null;
  is_bookable: boolean | null;
  is_active: boolean;
  created_at: string;
};

/**
 * Public-safe procedure menu for a doctor (profile + booking). Direct table reads are
 * owner-only under RLS, so visitors and patients must go through this RPC.
 */
export async function fetchPublicDoctorProcedures(
  doctorId: string,
  bookableOnly = false,
): Promise<PublicDoctorProcedure[]> {
  const { data, error } = await (supabase as any).rpc('get_public_doctor_procedures', {
    _doctor_id: doctorId,
    _bookable_only: bookableOnly,
  });
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({
    id: String(r.id),
    dentist_id: String(r.dentist_id),
    name: String(r.name ?? ''),
    description: r.description ?? null,
    category: r.category ?? null,
    type: r.type ?? null,
    default_cost: r.default_cost == null ? null : Number(r.default_cost),
    price: r.price == null ? null : Number(r.price),
    currency: r.currency ?? null,
    duration_minutes: r.duration_minutes == null ? null : Number(r.duration_minutes),
    is_bookable: r.is_bookable ?? null,
    is_active: true,
    created_at: r.created_at,
  }));
}
