// File: src/components/imaging/ImagingBillingSection.tsx
// FULL FILE REPLACEMENT

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RefreshCw,
  Download,
  DollarSign,
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CalendarDays,
  Receipt,
  Clock3,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  PiggyBank,
  CircleDollarSign,
  FileText,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type Props = {
  centerId: string;
};

type BillingTransactionRow = {
  id: string;
  amount: number | null;
  currency?: string | null;
  status?: string | null;
  transaction_type?: string | null;
  created_at: string;
  updated_at?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  user_id?: string | null;
  invoice_id?: string | null;
  payment_intent_id?: string | null;
  provider?: string | null;
  provider_data?: any;
  metadata?: any;
  description?: string | null;
};

type InvoiceRow = {
  id: string;
  invoice_number?: string | null;
  amount_total?: number | null;
  amount_due?: number | null;
  amount_paid?: number | null;
  currency?: string | null;
  status?: string | null;
  due_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  patient_id?: string | null;
  metadata?: any;
};

type HoldRow = {
  id: string;
  amount?: number | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  provider_data?: any;
  metadata?: any;
};

type SubscriptionRow = {
  id: string;
  status?: string | null;
  plan_name?: string | null;
  plan_interval?: string | null;
  amount?: number | null;
  amount_cents?: number | null;
  currency?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  created_at?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: any;
};

type AnalyticsPayload = {
  kpis: {
    txCount: number;
    successfulTxCount: number;
    failedTxCount: number;
    pendingTxCount: number;
    processedCents: number;
    refundedCents: number;
    netCents: number;
    avgTicketCents: number;
    chargebackCents: number;
    heldCents: number;
    releasedHoldCents: number;
    invoicesTotalCents: number;
    invoicesPaidCents: number;
    invoicesDueCents: number;
    overdueInvoicesCount: number;
    collectionRatePct: number;
    activeSubscriptions: number;
    mrrCents: number;
    arrCents: number;
    txChangePct: number;
    revenueChangePct: number;
    collectionChangePct: number;
  };
  daily: Array<{
    date: string;
    processed: number;
    refunded: number;
    net: number;
    txCount: number;
    successCount: number;
  }>;
  typeBreakdown: Array<{ name: string; value: number; amount: number }>;
  statusBreakdown: Array<{ name: string; value: number }>;
  methodBreakdown: Array<{ name: string; value: number; amount: number }>;
  providerBreakdown: Array<{ name: string; value: number; amount: number }>;
  invoiceStatusBreakdown: Array<{ name: string; value: number; amount: number }>;
  recentTransactions: BillingTransactionRow[];
  outstandingInvoices: InvoiceRow[];
  subscriptions: {
    rows: SubscriptionRow[];
    byPlan: Array<{ name: string; value: number; amount: number }>;
  };
  warnings: string[];
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground))",
  "hsl(220 70% 55%)",
  "hsl(160 60% 45%)",
];

function safeNum(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function parseDate(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function labelDateShort(v: string) {
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function normalize(v: unknown) {
  return String(v || "").trim().toLowerCase();
}

function humanize(v: unknown) {
  const s = normalize(v);
  if (!s) return "Unknown";
  return s
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

function pctChange(curr: number, prev: number) {
  if (prev > 0) return Math.round(((curr - prev) / prev) * 100);
  if (curr > 0) return 100;
  return 0;
}

function centsToMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents || 0) / 100);
}

function amountToCents(v: number | null | undefined) {
  const n = safeNum(v, 0);
  // If already cents-like integer values are used in platform, keep as integer.
  // If decimal dollars are used, convert to cents.
  return Number.isInteger(n) && Math.abs(n) >= 1000 ? Math.round(n) : Math.round(n * 100);
}

function txIsSuccessful(status: string) {
  return ["completed", "succeeded", "paid", "captured", "success"].includes(status);
}

function txIsPending(status: string) {
  return ["pending", "processing", "requires_action", "authorized", "held"].includes(status);
}

function txIsFailed(status: string) {
  return ["failed", "canceled", "cancelled", "declined", "error"].includes(status);
}

function txMethod(tx: BillingTransactionRow) {
  const pd = safeObj(tx.provider_data);
  const md = safeObj(tx.metadata);
  return (
    (typeof pd.payment_method === "string" && pd.payment_method) ||
    (typeof pd.method === "string" && pd.method) ||
    (typeof md.payment_method === "string" && md.payment_method) ||
    (typeof md.method === "string" && md.method) ||
    "unknown"
  );
}

function txProvider(tx: BillingTransactionRow) {
  const pd = safeObj(tx.provider_data);
  return (
    (typeof tx.provider === "string" && tx.provider) ||
    (typeof pd.provider === "string" && pd.provider) ||
    (typeof pd.gateway === "string" && pd.gateway) ||
    "unknown"
  );
}

function txDisplayTitle(tx: BillingTransactionRow) {
  const type = humanize(tx.transaction_type || "transaction");
  if (tx.description) return tx.description;
  const pd = safeObj(tx.provider_data);
  const md = safeObj(tx.metadata);
  const exam =
    (typeof pd.exam_name === "string" && pd.exam_name) ||
    (typeof md.exam_name === "string" && md.exam_name) ||
    (typeof pd.modality === "string" && `${pd.modality} exam`) ||
    (typeof md.modality === "string" && `${md.modality} exam`);
  return exam ? `${type} • ${exam}` : type;
}

function invoiceStatusBadge(statusRaw?: string | null) {
  const status = normalize(statusRaw);
  if (["paid", "settled"].includes(status)) return <Badge>Paid</Badge>;
  if (["open", "pending"].includes(status)) return <Badge variant="secondary">Open</Badge>;
  if (["partially_paid", "partial"].includes(status))
    return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Partially Paid</Badge>;
  if (["overdue"].includes(status))
    return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Overdue</Badge>;
  if (["void", "cancelled", "canceled"].includes(status)) return <Badge variant="destructive">Cancelled</Badge>;
  return <Badge variant="outline">{humanize(status || "unknown")}</Badge>;
}

function txStatusBadge(statusRaw?: string | null) {
  const status = normalize(statusRaw);
  if (txIsSuccessful(status)) return <Badge>Completed</Badge>;
  if (txIsPending(status))
    return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">{humanize(status)}</Badge>;
  if (txIsFailed(status)) return <Badge variant="destructive">{humanize(status)}</Badge>;
  return <Badge variant="outline">{humanize(status || "unknown")}</Badge>;
}

async function safeQuery<T>(
  factory: () => Promise<{ data: T[] | null; error: any }>,
  warnings: string[],
  warningKey: string,
) {
  try {
    const res = await factory();
    if (res.error) {
      warnings.push(`${warningKey}:${res.error.message || "query failed"}`);
      return [] as T[];
    }
    return (res.data || []) as T[];
  } catch (e: any) {
    warnings.push(`${warningKey}:${e?.message || "query failed"}`);
    return [] as T[];
  }
}

export default function ImagingBillingSection({ centerId }: Props) {
  const [period, setPeriod] = useState<"30" | "90" | "180">("90");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsPayload | null>(null);

  const days = useMemo(() => Number(period), [period]);

  const fetchData = async () => {
    if (!centerId) {
      setData(null);
      return;
    }

    setLoading(true);
    const sb: any = supabase as any;

    try {
      const now = new Date();
      const rangeEnd = endOfDay(now);
      const rangeStart = startOfDay(addDays(now, -(days - 1)));
      const prevStart = startOfDay(addDays(rangeStart, -days));
      const prevEnd = new Date(rangeStart.getTime() - 1);

      const warnings: string[] = [];

      const [txs, prevTxs, invoices, prevInvoices, holds, subs] = await Promise.all([
        safeQuery<BillingTransactionRow>(
          () =>
            sb
              .from("billing_transactions")
              .select("*")
              .eq("entity_type", "imaging_center")
              .eq("entity_id", centerId)
              .gte("created_at", rangeStart.toISOString())
              .lte("created_at", rangeEnd.toISOString())
              .order("created_at", { ascending: false }),
          warnings,
          "billing_transactions_current",
        ),
        safeQuery<BillingTransactionRow>(
          () =>
            sb
              .from("billing_transactions")
              .select("*")
              .eq("entity_type", "imaging_center")
              .eq("entity_id", centerId)
              .gte("created_at", prevStart.toISOString())
              .lte("created_at", prevEnd.toISOString()),
          warnings,
          "billing_transactions_prev",
        ),
        // Try common invoice scoping variants; use first successful non-empty result.
        (async () => {
          const tries = [
            () =>
              sb
                .from("invoices")
                .select("*")
                .eq("entity_type", "imaging_center")
                .eq("entity_id", centerId)
                .order("created_at", { ascending: false })
                .limit(1000),
            () =>
              sb.from("invoices").select("*").eq("imaging_center_id", centerId).order("created_at", { ascending: false }).limit(1000),
            () =>
              sb
                .from("billing_invoices")
                .select("*")
                .eq("entity_type", "imaging_center")
                .eq("entity_id", centerId)
                .order("created_at", { ascending: false })
                .limit(1000),
          ];
          let last: any = null;
          for (let i = 0; i < tries.length; i++) {
            try {
              const res = await tries[i]();
              if (!res.error) return (res.data || []) as InvoiceRow[];
              last = res.error;
            } catch (e: any) {
              last = e;
            }
          }
          warnings.push(`invoices:${last?.message || "query failed"}`);
          return [] as InvoiceRow[];
        })(),
        (async () => {
          const tries = [
            () =>
              sb
                .from("invoices")
                .select("*")
                .eq("entity_type", "imaging_center")
                .eq("entity_id", centerId)
                .gte("created_at", prevStart.toISOString())
                .lte("created_at", prevEnd.toISOString()),
            () =>
              sb
                .from("invoices")
                .select("*")
                .eq("imaging_center_id", centerId)
                .gte("created_at", prevStart.toISOString())
                .lte("created_at", prevEnd.toISOString()),
            () =>
              sb
                .from("billing_invoices")
                .select("*")
                .eq("entity_type", "imaging_center")
                .eq("entity_id", centerId)
                .gte("created_at", prevStart.toISOString())
                .lte("created_at", prevEnd.toISOString()),
          ];
          let last: any = null;
          for (let i = 0; i < tries.length; i++) {
            try {
              const res = await tries[i]();
              if (!res.error) return (res.data || []) as InvoiceRow[];
              last = res.error;
            } catch (e: any) {
              last = e;
            }
          }
          warnings.push(`invoices_prev:${last?.message || "query failed"}`);
          return [] as InvoiceRow[];
        })(),
        (async () => {
          const tries = [
            () =>
              sb
                .from("payment_holds")
                .select("*")
                .eq("entity_type", "imaging_center")
                .eq("entity_id", centerId)
                .gte("created_at", rangeStart.toISOString())
                .lte("created_at", rangeEnd.toISOString()),
            () =>
              sb
                .from("payment_holds")
                .select("*")
                .eq("imaging_center_id", centerId)
                .gte("created_at", rangeStart.toISOString())
                .lte("created_at", rangeEnd.toISOString()),
          ];
          let last: any = null;
          for (const q of tries) {
            try {
              const res = await q();
              if (!res.error) return (res.data || []) as HoldRow[];
              last = res.error;
            } catch (e: any) {
              last = e;
            }
          }
          warnings.push(`payment_holds:${last?.message || "query failed"}`);
          return [] as HoldRow[];
        })(),
        (async () => {
          const tries = [
            () => sb.from("subscriptions").select("*").eq("entity_type", "imaging_center").eq("entity_id", centerId),
            () => sb.from("subscriptions").select("*").eq("imaging_center_id", centerId),
          ];
          let last: any = null;
          for (const q of tries) {
            try {
              const res = await q();
              if (!res.error) return (res.data || []) as SubscriptionRow[];
              last = res.error;
            } catch (e: any) {
              last = e;
            }
          }
          warnings.push(`subscriptions:${last?.message || "query failed"}`);
          return [] as SubscriptionRow[];
        })(),
      ]);

      const dayBuckets: Record<
        string,
        { date: string; processed: number; refunded: number; net: number; txCount: number; successCount: number }
      > = {};
      for (let i = 0; i < days; i++) {
        const d = addDays(rangeStart, i);
        const k = dateKey(d);
        dayBuckets[k] = { date: k, processed: 0, refunded: 0, net: 0, txCount: 0, successCount: 0 };
      }

      let txCount = 0;
      let successfulTxCount = 0;
      let failedTxCount = 0;
      let pendingTxCount = 0;
      let processedCents = 0;
      let refundedCents = 0;
      let chargebackCents = 0;

      const typeMap = new Map<string, { count: number; amount: number }>();
      const statusMap = new Map<string, number>();
      const methodMap = new Map<string, { count: number; amount: number }>();
      const providerMap = new Map<string, { count: number; amount: number }>();

      for (const tx of txs) {
        txCount += 1;
        const status = normalize(tx.status);
        const type = normalize(tx.transaction_type) || "transaction";
        const amountCents = Math.abs(amountToCents(tx.amount));

        statusMap.set(humanize(status || "unknown"), (statusMap.get(humanize(status || "unknown")) || 0) + 1);
        const tm = typeMap.get(humanize(type)) || { count: 0, amount: 0 };
        tm.count += 1;
        tm.amount += amountCents;
        typeMap.set(humanize(type), tm);

        const method = humanize(txMethod(tx));
        const mm = methodMap.get(method) || { count: 0, amount: 0 };
        mm.count += 1;
        mm.amount += amountCents;
        methodMap.set(method, mm);

        const provider = humanize(txProvider(tx));
        const pm = providerMap.get(provider) || { count: 0, amount: 0 };
        pm.count += 1;
        pm.amount += amountCents;
        providerMap.set(provider, pm);

        if (txIsSuccessful(status)) {
          successfulTxCount += 1;
          if (["refund", "refunded", "hold_release", "release"].includes(type)) {
            refundedCents += amountCents;
          } else if (["chargeback"].includes(type)) {
            chargebackCents += amountCents;
          } else {
            processedCents += amountCents;
          }
        } else if (txIsFailed(status)) {
          failedTxCount += 1;
        } else if (txIsPending(status)) {
          pendingTxCount += 1;
        }

        const created = parseDate(tx.created_at);
        if (created) {
          const k = dateKey(created);
          if (dayBuckets[k]) {
            dayBuckets[k].txCount += 1;
            if (txIsSuccessful(status)) dayBuckets[k].successCount += 1;

            if (txIsSuccessful(status)) {
              if (["refund", "refunded", "hold_release", "release"].includes(type)) dayBuckets[k].refunded += amountCents;
              else if (!["chargeback"].includes(type)) dayBuckets[k].processed += amountCents;
            }
          }
        }
      }

      for (const k of Object.keys(dayBuckets)) {
        dayBuckets[k].net = dayBuckets[k].processed - dayBuckets[k].refunded;
      }

      let prevProcessedCents = 0;
      let prevTxCount = 0;
      for (const tx of prevTxs) {
        prevTxCount += 1;
        const status = normalize(tx.status);
        const type = normalize(tx.transaction_type);
        const amountCents = Math.abs(amountToCents(tx.amount));
        if (txIsSuccessful(status) && !["refund", "refunded", "hold_release", "release", "chargeback"].includes(type)) {
          prevProcessedCents += amountCents;
        }
      }

      let heldCents = 0;
      let releasedHoldCents = 0;
      for (const h of holds) {
        const status = normalize(h.status);
        const amt = Math.abs(amountToCents(h.amount));
        if (["held", "active", "authorized", "pending"].includes(status)) heldCents += amt;
        if (["released", "expired", "cancelled", "canceled"].includes(status)) releasedHoldCents += amt;
      }

      const invoiceStatusMap = new Map<string, { count: number; amount: number }>();
      let invoicesTotalCents = 0;
      let invoicesPaidCents = 0;
      let invoicesDueCents = 0;
      let overdueInvoicesCount = 0;

      const nowTs = Date.now();
      const currentInvoices = invoices.filter((inv) => {
        const created = parseDate(inv.created_at || null);
        if (!created) return true;
        return created >= rangeStart && created <= rangeEnd;
      });

      const prevInvoiceSet = prevInvoices;
      let prevInvoicesTotalCents = 0;
      let prevInvoicesPaidCents = 0;
      for (const inv of prevInvoiceSet) {
        prevInvoicesTotalCents += amountToCents(inv.amount_total ?? inv.amount_due ?? 0);
        prevInvoicesPaidCents += amountToCents(inv.amount_paid ?? 0);
      }
      const prevCollectionRate = prevInvoicesTotalCents > 0 ? Math.round((prevInvoicesPaidCents / prevInvoicesTotalCents) * 100) : 0;

      for (const inv of currentInvoices) {
        const status = normalize(inv.status);
        const total = amountToCents(inv.amount_total ?? inv.amount_due ?? inv.amount_paid ?? 0);
        const paid = amountToCents(inv.amount_paid ?? 0);
        const due = amountToCents(inv.amount_due ?? Math.max(0, total - paid));

        invoicesTotalCents += total;
        invoicesPaidCents += paid;
        invoicesDueCents += due;

        if (status === "overdue") overdueInvoicesCount += 1;
        else if (inv.due_date) {
          const dueAt = parseDate(inv.due_date);
          if (dueAt && dueAt.getTime() < nowTs && due > 0 && !["paid", "void", "cancelled", "canceled"].includes(status)) {
            overdueInvoicesCount += 1;
          }
        }

        const key = humanize(status || "unknown");
        const bucket = invoiceStatusMap.get(key) || { count: 0, amount: 0 };
        bucket.count += 1;
        bucket.amount += total;
        invoiceStatusMap.set(key, bucket);
      }

      const collectionRatePct = invoicesTotalCents > 0 ? Math.round((invoicesPaidCents / invoicesTotalCents) * 100) : 0;

      const activeSubs = subs.filter((s) => ["active", "trialing", "past_due"].includes(normalize(s.status)));
      let mrrCents = 0;
      const subsByPlan = new Map<string, { value: number; amount: number }>();

      for (const s of activeSubs) {
        const interval = normalize(s.plan_interval) || normalize(safeObj(s.metadata).interval) || "month";
        const amountCents = Math.abs(amountToCents(s.amount_cents ?? s.amount ?? 0));
        const planName =
          String(s.plan_name || (typeof safeObj(s.metadata).plan_name === "string" ? safeObj(s.metadata).plan_name : "Subscription"));

        if (interval.includes("year")) mrrCents += Math.round(amountCents / 12);
        else mrrCents += amountCents;

        const row = subsByPlan.get(planName) || { value: 0, amount: 0 };
        row.value += 1;
        row.amount += amountCents;
        subsByPlan.set(planName, row);
      }

      const avgTicketCents = successfulTxCount > 0 ? Math.round(processedCents / successfulTxCount) : 0;
      const netCents = processedCents - refundedCents - chargebackCents;
      const arrCents = mrrCents * 12;

      const payload: AnalyticsPayload = {
        kpis: {
          txCount,
          successfulTxCount,
          failedTxCount,
          pendingTxCount,
          processedCents,
          refundedCents,
          netCents,
          avgTicketCents,
          chargebackCents,
          heldCents,
          releasedHoldCents,
          invoicesTotalCents,
          invoicesPaidCents,
          invoicesDueCents,
          overdueInvoicesCount,
          collectionRatePct,
          activeSubscriptions: activeSubs.length,
          mrrCents,
          arrCents,
          txChangePct: pctChange(txCount, prevTxCount),
          revenueChangePct: pctChange(processedCents, prevProcessedCents),
          collectionChangePct: pctChange(collectionRatePct, prevCollectionRate),
        },
        daily: Object.values(dayBuckets).sort((a, b) => a.date.localeCompare(b.date)),
        typeBreakdown: [...typeMap.entries()]
          .map(([name, row]) => ({ name, value: row.count, amount: row.amount }))
          .sort((a, b) => b.amount - a.amount),
        statusBreakdown: [...statusMap.entries()]
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
        methodBreakdown: [...methodMap.entries()]
          .map(([name, row]) => ({ name, value: row.count, amount: row.amount }))
          .sort((a, b) => b.amount - a.amount),
        providerBreakdown: [...providerMap.entries()]
          .map(([name, row]) => ({ name, value: row.count, amount: row.amount }))
          .sort((a, b) => b.amount - a.amount),
        invoiceStatusBreakdown: [...invoiceStatusMap.entries()]
          .map(([name, row]) => ({ name, value: row.count, amount: row.amount }))
          .sort((a, b) => b.amount - a.amount),
        recentTransactions: txs.slice(0, 12),
        outstandingInvoices: currentInvoices
          .filter((inv) => {
            const status = normalize(inv.status);
            const due = amountToCents(inv.amount_due ?? 0);
            return due > 0 && !["paid", "void", "cancelled", "canceled"].includes(status);
          })
          .sort((a, b) => {
            const da = parseDate(a.due_date || a.created_at || null)?.getTime() || 0;
            const db = parseDate(b.due_date || b.created_at || null)?.getTime() || 0;
            return da - db;
          })
          .slice(0, 12),
        subscriptions: {
          rows: subs.slice(0, 20),
          byPlan: [...subsByPlan.entries()]
            .map(([name, row]) => ({ name, value: row.value, amount: row.amount }))
            .sort((a, b) => b.value - a.value),
        },
        warnings,
      };

      setData(payload);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load billing data");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId, days]);

  const exportCsv = () => {
    if (!data) return;

    const rows: string[] = [];
    rows.push(["Date", "ProcessedCents", "RefundedCents", "NetCents", "TxCount", "SuccessCount"].join(","));
    for (const d of data.daily) {
      rows.push([d.date, d.processed, d.refunded, d.net, d.txCount, d.successCount].join(","));
    }

    rows.push("");
    rows.push(["Type", "Count", "AmountCents"].join(","));
    for (const r of data.typeBreakdown) {
      rows.push([`"${r.name}"`, r.value, r.amount].join(","));
    }

    rows.push("");
    rows.push(["PaymentMethod", "Count", "AmountCents"].join(","));
    for (const r of data.methodBreakdown) {
      rows.push([`"${r.name}"`, r.value, r.amount].join(","));
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `imaging-billing-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const TrendDelta = ({ value, inverseGood = false }: { value: number; inverseGood?: boolean }) => {
    const positive = value >= 0;
    const good = inverseGood ? !positive : positive;
    const Icon = positive ? TrendingUp : TrendingDown;
    return (
      <div className={`flex items-center gap-1 text-xs ${good ? "text-green-600" : "text-destructive"}`}>
        <Icon className="h-3 w-3" />
        <span>{Math.abs(value)}% vs previous period</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="h-10 w-64 rounded bg-muted animate-pulse" />
          <div className="h-10 w-48 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 rounded bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Card><CardContent className="p-6"><div className="h-72 rounded bg-muted animate-pulse" /></CardContent></Card>
          <Card><CardContent className="p-6"><div className="h-72 rounded bg-muted animate-pulse" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <CircleDollarSign className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No billing data available</p>
          <p className="text-sm text-muted-foreground mt-1">
            Transactions, invoices, and subscriptions will appear here once billing activity starts.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => void fetchData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { kpis } = data;
  const hasWarnings = data.warnings.length > 0;
  const maxMethodAmt = Math.max(0, ...data.methodBreakdown.map((x) => x.amount));
  const maxProviderAmt = Math.max(0, ...data.providerBreakdown.map((x) => x.amount));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={(v) => setPeriod(v as "30" | "90" | "180")}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 180 days</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => void fetchData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          {hasWarnings && (
            <Badge variant="secondary" className="gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Partial data
            </Badge>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {hasWarnings && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Billing view is partially populated
            </CardTitle>
            <CardDescription>
              Some tables may be unavailable in your schema or current permissions. Core transaction analytics still loads.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {data.warnings.slice(0, 8).map((w) => (
                <Badge key={w} variant="outline" className="text-xs">
                  {w.split(":")[0]}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Processed Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{centsToMoney(kpis.processedCents)}</div>
            <TrendDelta value={kpis.revenueChangePct} />
            <div className="mt-2 text-xs text-muted-foreground">
              Net {centsToMoney(kpis.netCents)} • Refunded {centsToMoney(kpis.refundedCents)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.txCount}</div>
            <TrendDelta value={kpis.txChangePct} />
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{kpis.successfulTxCount} success</Badge>
              <Badge variant="secondary">{kpis.pendingTxCount} pending</Badge>
              <Badge variant="destructive">{kpis.failedTxCount} failed</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Average Ticket</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{centsToMoney(kpis.avgTicketCents)}</div>
            <div className="mt-2 text-xs text-muted-foreground">Based on successful non-refund transaction volume</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <Receipt className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.collectionRatePct}%</div>
            <TrendDelta value={kpis.collectionChangePct} />
            <div className="mt-2 text-xs text-muted-foreground">
              Paid {centsToMoney(kpis.invoicesPaidCents)} / Invoiced {centsToMoney(kpis.invoicesTotalCents)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Outstanding Invoices</CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{centsToMoney(kpis.invoicesDueCents)}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">{data.outstandingInvoices.length} open items</Badge>
              <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                {kpis.overdueInvoicesCount} overdue
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Payment Holds</CardTitle>
            <ShieldAlert className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{centsToMoney(kpis.heldCents)}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Released {centsToMoney(kpis.releasedHoldCents)} in selected period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <PiggyBank className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.activeSubscriptions}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              MRR {centsToMoney(kpis.mrrCents)} • ARR {centsToMoney(kpis.arrCents)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Risk / Leakage</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{centsToMoney(kpis.chargebackCents)}</div>
            <div className="mt-2 text-xs text-muted-foreground">Chargebacks in selected period</div>
          </CardContent>
        </Card>
      </div>

      {/* Trend + Status */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Processed, refunded, net revenue and transaction counts over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={data.daily}>
                <XAxis dataKey="date" tickFormatter={(v) => labelDateShort(String(v))} minTickGap={20} className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                  labelFormatter={(v) => labelDateShort(String(v))}
                  formatter={(value, name) => {
                    if (["processed", "refunded", "net"].includes(String(name))) {
                      return [centsToMoney(Number(value)), humanize(name)];
                    }
                    return [value as any, humanize(name)];
                  }}
                />
                <Line type="monotone" dataKey="processed" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="refunded" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="net" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="txCount" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Status Mix</CardTitle>
            <CardDescription>Distribution by transaction status</CardDescription>
          </CardHeader>
          <CardContent>
            {data.statusBreakdown.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
                No transaction status data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={data.statusBreakdown} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2}>
                    {data.statusBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Breakdowns */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction Types</CardTitle>
            <CardDescription>Payments, refunds, captures, releases, etc.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.typeBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No type data yet.</p>
            ) : (
              data.typeBreakdown.slice(0, 10).map((r, i) => (
                <div key={r.name} className="flex items-center justify-between p-2 rounded bg-muted/40">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{centsToMoney(r.amount)}</p>
                  </div>
                  <Badge variant={i === 0 ? "default" : "outline"}>{r.value}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Status</CardTitle>
            <CardDescription>Current period invoices by status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.invoiceStatusBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoice data available.</p>
            ) : (
              data.invoiceStatusBreakdown.map((r, i) => (
                <div key={r.name} className="flex items-center justify-between p-2 rounded bg-muted/40">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{centsToMoney(r.amount)}</p>
                  </div>
                  <Badge variant={i === 0 ? "default" : "outline"}>{r.value}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription Plans</CardTitle>
            <CardDescription>Active subscriptions by plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.subscriptions.byPlan.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subscriptions found.</p>
            ) : (
              data.subscriptions.byPlan.map((r, i) => (
                <div key={r.name} className="flex items-center justify-between p-2 rounded bg-muted/40">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{centsToMoney(r.amount)}</p>
                  </div>
                  <Badge variant={i === 0 ? "default" : "outline"}>{r.value}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Methods + Providers */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Amount processed by method (from provider metadata)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.methodBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment method data.</p>
            ) : (
              data.methodBreakdown.map((row, idx) => {
                const w = maxMethodAmt > 0 ? Math.round((row.amount / maxMethodAmt) * 100) : 0;
                return (
                  <div key={row.name} className="flex items-center gap-3">
                    <div className="w-28 text-sm font-medium truncate">{row.name}</div>
                    <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${w}%`, backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                    </div>
                    <div className="w-36 text-right">
                      <div className="text-sm font-medium">{centsToMoney(row.amount)}</div>
                      <div className="text-xs text-muted-foreground">{row.value} tx</div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Providers / Gateways</CardTitle>
            <CardDescription>Volume by payment provider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.providerBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No provider data.</p>
            ) : (
              data.providerBreakdown.map((row, idx) => {
                const w = maxProviderAmt > 0 ? Math.round((row.amount / maxProviderAmt) * 100) : 0;
                return (
                  <div key={row.name} className="flex items-center gap-3">
                    <div className="w-28 text-sm font-medium truncate">{row.name}</div>
                    <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${w}%`, backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                    </div>
                    <div className="w-36 text-right">
                      <div className="text-sm font-medium">{centsToMoney(row.amount)}</div>
                      <div className="text-xs text-muted-foreground">{row.value} tx</div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions + outstanding invoices */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>Latest billing events for this imaging center</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <div className="space-y-3">
                {data.recentTransactions.map((tx) => {
                  const amountCents = Math.abs(amountToCents(tx.amount));
                  const method = humanize(txMethod(tx));
                  const provider = humanize(txProvider(tx));
                  const created = parseDate(tx.created_at);

                  return (
                    <div key={tx.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{txDisplayTitle(tx)}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {humanize(tx.transaction_type || "transaction")} • {method} • {provider}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {created ? created.toLocaleString() : "Unknown date"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-semibold">{centsToMoney(amountCents, tx.currency || "USD")}</div>
                          <div className="mt-1">{txStatusBadge(tx.status)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Outstanding Invoices
            </CardTitle>
            <CardDescription>Invoices with remaining balance</CardDescription>
          </CardHeader>
          <CardContent>
            {data.outstandingInvoices.length === 0 ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                No outstanding invoices in selected period.
              </div>
            ) : (
              <div className="space-y-3">
                {data.outstandingInvoices.map((inv) => {
                  const total = amountToCents(inv.amount_total ?? inv.amount_due ?? 0);
                  const paid = amountToCents(inv.amount_paid ?? 0);
                  const due = amountToCents(inv.amount_due ?? Math.max(0, total - paid));
                  const dueDate = parseDate(inv.due_date || null);
                  const overdue =
                    dueDate && dueDate.getTime() < Date.now() && due > 0 && !["paid"].includes(normalize(inv.status));

                  return (
                    <div key={inv.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {inv.invoice_number || `Invoice ${inv.id.slice(0, 8).toUpperCase()}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Total {centsToMoney(total, inv.currency || "USD")} • Paid {centsToMoney(paid, inv.currency || "USD")}
                          </p>
                          <p className={`text-xs mt-1 ${overdue ? "text-orange-600" : "text-muted-foreground"}`}>
                            Due {dueDate ? dueDate.toLocaleDateString() : "N/A"}
                            {overdue ? " • Overdue" : ""}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className={`font-semibold ${overdue ? "text-orange-600" : ""}`}>
                            {centsToMoney(due, inv.currency || "USD")}
                          </div>
                          <div className="mt-1">{invoiceStatusBadge(inv.status)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily performance bars */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Transaction Success</CardTitle>
            <CardDescription>Transaction counts and successful counts by day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.daily}>
                <XAxis dataKey="date" tickFormatter={(v) => labelDateShort(String(v))} minTickGap={20} className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                  labelFormatter={(v) => labelDateShort(String(v))}
                />
                <Bar dataKey="txCount" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="successCount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Type Mix</CardTitle>
            <CardDescription>Top transaction types by amount</CardDescription>
          </CardHeader>
          <CardContent>
            {data.typeBreakdown.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.typeBreakdown.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={110} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                    formatter={(v, n) => (n === "amount" ? [centsToMoney(Number(v)), "Amount"] : [v as any, "Count"])}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
