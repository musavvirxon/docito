// Shared source of truth for "money actually collected" by a doctor.
//
// Every finance/performance surface (earnings cards, chart, services, pending,
// insights, advanced KPIs, superbills) reads from this helper so the numbers
// can never diverge between screens.
import { supabase } from "@/integrations/supabase/client";

export interface CollectedPayment {
  /** Stable dedupe key: `payment:<id>` or `ledger:<id>`. */
  key: string;
  appointmentId: string | null;
  patientId: string | null;
  /** Major currency units (not cents). */
  amount: number;
  /** ISO timestamp of when the money was collected. */
  at: string;
  allocations: Array<{ chargeId: string | null; description: string | null; amountCents: number }>;
}

export interface LedgerCharge {
  id: string;
  appointmentId: string | null;
  patientId: string | null;
  /** Cents */
  totalCents: number;
  paidCents: number;
  remainingCents: number;
  description: string | null;
  serviceName: string | null;
  sourceTable: string | null;
  sourceId: string | null;
  appointmentProcedureId: string | null;
  createdAt: string;
  status: "paid" | "partial" | "unpaid";
}

export interface DoctorCollections {
  payments: CollectedPayment[];
  charges: LedgerCharge[];
  /** Total collected across all time, major units. */
  totalCollected: number;
  /** Total still owed across all ledger charges, major units. */
  totalOutstanding: number;
  /** Total refunded / voided, major units. */
  totalRefunded: number;
  /** appointmentId -> collected amount (major units). */
  paidByAppointment: Map<string, number>;
  /** `${source_table}:${source_id}` -> ledger charge. */
  chargeBySource: Map<string, LedgerCharge>;
  /** appointment_procedure_id -> ledger charge. */
  chargeByAppointmentProcedure: Map<string, LedgerCharge>;
}

const PAID_PAYMENT_STATUSES = ["paid", "completed", "succeeded", "partial"];
const DEAD_STATUSES = new Set(["refunded", "failed", "voided", "canceled", "cancelled"]);
const NON_CHARGE_TYPES = new Set(["payment", "discount", "refund"]);

const toCents = (amountCents: unknown, amount: unknown) =>
  amountCents != null ? Number(amountCents) : Math.round((Number(amount) || 0) * 100);

const normalizeName = (value: string | null | undefined) =>
  String(value || "").trim().toLowerCase();

/** Extracts allocation rows the `record_billing_payment` RPC stores on payment metadata. */
const readAllocations = (metadata: any): CollectedPayment["allocations"] => {
  const raw = metadata?.allocations;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a: any) => ({
      chargeId: a?.charge_id ?? null,
      description: a?.description ?? null,
      amountCents: Number(a?.amount_cents) || 0,
    }))
    .filter((a) => a.amountCents > 0);
};

export const emptyDoctorCollections = (): DoctorCollections => ({
  payments: [],
  charges: [],
  totalCollected: 0,
  totalOutstanding: 0,
  totalRefunded: 0,
  paidByAppointment: new Map(),
  chargeBySource: new Map(),
  chargeByAppointmentProcedure: new Map(),
});

export async function fetchDoctorCollections(doctorId: string): Promise<DoctorCollections> {
  const [paymentsRes, ledgerRes] = await Promise.all([
    supabase
      .from("payments")
      .select("id, appointment_id, patient_id, amount, status, paid_at, created_at, metadata")
      .eq("doctor_id", doctorId)
      .in("status", PAID_PAYMENT_STATUSES),
    supabase
      .from("billing_transactions")
      .select(
        "id, appointment_id, patient_id, amount, amount_cents, paid_cents, created_at, transaction_type, status, description, metadata, appointment_procedure_id",
      )
      .eq("doctor_id", doctorId),
  ]);

  const paymentRows = (paymentsRes.data as any[]) || [];
  const ledgerRows = (ledgerRes.data as any[]) || [];

  const payments: CollectedPayment[] = [
    ...paymentRows.map((r: any) => ({
      key: `payment:${r.id}`,
      appointmentId: r.appointment_id ?? null,
      patientId: r.patient_id ?? null,
      amount: Number(r.amount) || 0,
      at: r.paid_at || r.created_at,
      allocations: readAllocations(r.metadata),
    })),
    ...ledgerRows
      .filter((r: any) => r.transaction_type === "payment")
      .filter((r: any) => !DEAD_STATUSES.has(String(r.status || "").toLowerCase()))
      .map((r: any) => ({
        key: `ledger:${r.id}`,
        appointmentId: r.appointment_id ?? null,
        patientId: r.patient_id ?? null,
        amount: toCents(r.amount_cents, r.amount) / 100,
        at: r.created_at,
        allocations: readAllocations(r.metadata),
      })),
  ].filter((r) => r.amount > 0 && !!r.at);

  const uniquePayments = Array.from(new Map(payments.map((p) => [p.key, p])).values()).sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );

  const charges: LedgerCharge[] = ledgerRows
    .filter((r: any) => !NON_CHARGE_TYPES.has(String(r.transaction_type || "charge")))
    .filter((r: any) => !DEAD_STATUSES.has(String(r.status || "").toLowerCase()))
    .map((r: any) => {
      const totalCents = toCents(r.amount_cents, r.amount);
      const paidCents = Math.min(Number(r.paid_cents) || 0, totalCents);
      const remainingCents = Math.max(totalCents - paidCents, 0);
      return {
        id: r.id,
        appointmentId: r.appointment_id ?? null,
        patientId: r.patient_id ?? null,
        totalCents,
        paidCents,
        remainingCents,
        description: r.description ?? null,
        serviceName: r.metadata?.procedure_name ?? r.description ?? null,
        sourceTable: r.metadata?.source_table ?? null,
        sourceId: r.metadata?.source_id ?? null,
        appointmentProcedureId: r.appointment_procedure_id ?? null,
        createdAt: r.created_at,
        status: remainingCents <= 0 ? "paid" : paidCents > 0 ? "partial" : "unpaid",
      } as LedgerCharge;
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const paidByAppointment = new Map<string, number>();
  uniquePayments.forEach((p) => {
    if (!p.appointmentId) return;
    paidByAppointment.set(p.appointmentId, (paidByAppointment.get(p.appointmentId) || 0) + p.amount);
  });

  const chargeBySource = new Map<string, LedgerCharge>();
  const chargeByAppointmentProcedure = new Map<string, LedgerCharge>();
  charges.forEach((c) => {
    if (c.sourceTable && c.sourceId) chargeBySource.set(`${c.sourceTable}:${c.sourceId}`, c);
    if (c.appointmentProcedureId) chargeByAppointmentProcedure.set(c.appointmentProcedureId, c);
  });

  const totalRefunded =
    ledgerRows
      .filter(
        (r: any) =>
          String(r.transaction_type) === "refund" ||
          DEAD_STATUSES.has(String(r.status || "").toLowerCase()),
      )
      .reduce((sum: number, r: any) => sum + toCents(r.amount_cents, r.amount), 0) / 100;

  return {
    payments: uniquePayments,
    charges,
    totalCollected: uniquePayments.reduce((sum, p) => sum + p.amount, 0),
    totalOutstanding: charges.reduce((sum, c) => sum + c.remainingCents, 0) / 100,
    totalRefunded,
    paidByAppointment,
    chargeBySource,
    chargeByAppointmentProcedure,
  };
}

/** Collected amount grouped by normalized service name, limited to a date range. */
export function collectedByService(
  collections: DoctorCollections,
  rangeStart: Date,
  rangeEnd: Date,
): Map<string, { collected: number; billed: number; outstanding: number; charges: number }> {
  const map = new Map<string, { collected: number; billed: number; outstanding: number; charges: number }>();
  collections.charges.forEach((c) => {
    const at = new Date(c.createdAt);
    if (at < rangeStart || at > rangeEnd) return;
    const key = normalizeName(c.serviceName);
    if (!key) return;
    const entry = map.get(key) || { collected: 0, billed: 0, outstanding: 0, charges: 0 };
    entry.collected += c.paidCents / 100;
    entry.billed += c.totalCents / 100;
    entry.outstanding += c.remainingCents / 100;
    entry.charges += 1;
    map.set(key, entry);
  });
  return map;
}

export const serviceKey = normalizeName;

/** Collected payments inside a date range (major units). */
export function collectedInRange(
  collections: DoctorCollections,
  rangeStart: Date,
  rangeEnd: Date,
): number {
  return collections.payments
    .filter((p) => {
      const d = new Date(p.at);
      return d >= rangeStart && d <= rangeEnd;
    })
    .reduce((sum, p) => sum + p.amount, 0);
}
