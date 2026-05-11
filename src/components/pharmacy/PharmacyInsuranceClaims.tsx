// File: src/components/pharmacy/PharmacyInsuranceClaims.tsx
// FULL FILE REPLACEMENT

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Shield,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  Send,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Receipt,
  ClipboardCheck,
  Activity,
} from "lucide-react";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";

interface Props {
  pharmacyId: string;
}

type TimeRange = "7d" | "30d" | "90d";

type OrderRow = {
  id: string;
  order_number?: string | null;
  pharmacy_id?: string | null;
  patient_id?: string | null;
  prescription_id?: string | null;
  status?: string | null;
  priority?: string | null;
  total_amount?: number | null;
  insurance_amount?: number | null;
  copay_amount?: number | null;
  payment_status?: string | null;
  pickup_method?: string | null;
  estimated_ready_at?: string | null;
  ready_at?: string | null;
  picked_up_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ClaimStatus = "pending" | "submitted" | "approved" | "paid" | "rejected" | "not_claimable";

interface InsuranceClaim {
  id: string;
  orderNumber: string;
  patientId: string | null;
  prescriptionId: string | null;
  insuranceProvider: string;
  policyNumber: string;
  claimAmount: number;
  approvedAmount: number;
  copayAmount: number;
  status: ClaimStatus;
  paymentStatusRaw: string;
  orderStatusRaw: string;
  submittedAt: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  priority: string | null;
  pickupMethod: string | null;
  sourceTable: string;
}

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--muted-foreground))",
];

function toNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function safeDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatMoney(value: number): string {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function humanize(value: string): string {
  return String(value || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getRangeStart(timeRange: TimeRange): Date {
  const now = new Date();
  const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
  return new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
}

function mapClaimStatus(order: OrderRow): ClaimStatus {
  const insuranceAmount = toNumber(order.insurance_amount);
  if (insuranceAmount <= 0) return "not_claimable";

  const payment = String(order.payment_status || "").toLowerCase();
  const status = String(order.status || "").toLowerCase();

  if (["paid", "succeeded"].includes(payment)) return "paid";
  if (["approved", "authorized"].includes(payment)) return "approved";
  if (["rejected", "denied", "failed"].includes(payment)) return "rejected";
  if (["submitted", "processing", "in_review", "under_review"].includes(payment)) return "submitted";

  if (["paid", "completed"].includes(status) && insuranceAmount > 0) return "paid";
  if (["cancelled", "canceled", "rejected"].includes(status)) return "rejected";

  return "pending";
}

async function queryClaimOrders(
  pharmacyId: string,
  startIso: string,
): Promise<{ rows: OrderRow[]; sourceTable: string; warning?: string }> {
  const columns =
    "id,order_number,pharmacy_id,patient_id,prescription_id,status,priority,total_amount,insurance_amount,copay_amount,payment_status,pickup_method,estimated_ready_at,ready_at,picked_up_at,created_at,updated_at";

  const primary = await (supabase as any)
    .from("fulfillment_orders")
    .select(columns)
    .eq("pharmacy_id", pharmacyId)
    .gte("created_at", startIso)
    .order("created_at", { ascending: false });

  if (!primary.error) {
    return {
      rows: (primary.data || []) as OrderRow[],
      sourceTable: "fulfillment_orders",
    };
  }

  const fallback = await (supabase as any)
    .from("pharmacy_orders")
    .select(columns)
    .eq("pharmacy_id", pharmacyId)
    .gte("created_at", startIso)
    .order("created_at", { ascending: false });

  if (!fallback.error) {
    return {
      rows: (fallback.data || []) as OrderRow[],
      sourceTable: "pharmacy_orders",
      warning: "Using fallback table pharmacy_orders for claims proxy.",
    };
  }

  throw primary.error || fallback.error || new Error("Failed to load claimable order data");
}

function buildClaims(rows: OrderRow[], sourceTable: string): InsuranceClaim[] {
  return rows.map((order) => {
    const claimAmount = toNumber(order.total_amount);
    const approvedAmount = toNumber(order.insurance_amount);
    const copayAmount = toNumber(order.copay_amount);
    const claimStatus = mapClaimStatus(order);

    return {
      id: order.id,
      orderNumber: order.order_number || `ORD-${order.id.slice(0, 8)}`,
      patientId: order.patient_id || null,
      prescriptionId: order.prescription_id || null,
      insuranceProvider: approvedAmount > 0 ? "Insurance (order-linked)" : "N/A",
      policyNumber: approvedAmount > 0 ? `POL-${order.id.slice(0, 8).toUpperCase()}` : "—",
      claimAmount,
      approvedAmount,
      copayAmount,
      status: claimStatus,
      paymentStatusRaw: String(order.payment_status || "unknown"),
      orderStatusRaw: String(order.status || "unknown"),
      submittedAt: order.created_at || null,
      processedAt: order.updated_at || null,
      createdAt: order.created_at || new Date().toISOString(),
      updatedAt: order.updated_at || null,
      priority: order.priority || null,
      pickupMethod: order.pickup_method || null,
      sourceTable,
    };
  });
}

function statusBadge(status: ClaimStatus) {
  const styles: Record<ClaimStatus, string> = {
    pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
    submitted: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    approved: "bg-green-500/10 text-green-700 border-green-500/30",
    paid: "bg-primary/10 text-primary border-primary/30",
    rejected: "bg-destructive/10 text-destructive border-destructive/30",
    not_claimable: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Badge variant="outline" className={styles[status]}>
      {humanize(status)}
    </Badge>
  );
}

export default function PharmacyInsuranceClaims({ pharmacyId }: Props) {
  const { t } = useTranslation("pharmacyAdminDashboard");
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | "all">("all");
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const fetchClaims = async (manual = false) => {
    if (!pharmacyId) return;

    if (manual) setRefreshing(true);
    else setLoading(true);

    try {
      setWarning(null);
      const start = getRangeStart(timeRange);
      const res = await queryClaimOrders(pharmacyId, start.toISOString());

      if (res.warning) setWarning(res.warning);

      const transformed = buildClaims(res.rows, res.sourceTable);
      setClaims(transformed);
    } catch (error: any) {
      console.error("Error fetching claims:", error);
      toast.error(error?.message || "Failed to load billing documentation");
      setClaims([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (pharmacyId) {
      fetchClaims(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacyId, timeRange]);

  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        claim.insuranceProvider.toLowerCase().includes(q) ||
        claim.policyNumber.toLowerCase().includes(q) ||
        claim.orderNumber.toLowerCase().includes(q) ||
        claim.id.toLowerCase().includes(q) ||
        claim.paymentStatusRaw.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || claim.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [claims, searchTerm, statusFilter]);

  const claimableClaims = useMemo(
    () => claims.filter((c) => c.status !== "not_claimable"),
    [claims],
  );

  const kpis = useMemo(() => {
    const rows = claimableClaims;

    const countByStatus = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});

    const totalClaimed = rows.reduce((sum, r) => sum + r.claimAmount, 0);
    const totalApproved = rows.reduce((sum, r) => sum + r.approvedAmount, 0);
    const totalCopay = rows.reduce((sum, r) => sum + r.copayAmount, 0);
    const rejectedAmount = rows
      .filter((r) => r.status === "rejected")
      .reduce((sum, r) => sum + r.claimAmount, 0);

    const submittedLike = (countByStatus.submitted || 0) + (countByStatus.pending || 0);
    const resolved = (countByStatus.approved || 0) + (countByStatus.paid || 0) + (countByStatus.rejected || 0);
    const approvalEligible = resolved;
    const approvedResolved = (countByStatus.approved || 0) + (countByStatus.paid || 0);
    const approvalRate = approvalEligible > 0 ? (approvedResolved / approvalEligible) * 100 : 0;

    return {
      total: rows.length,
      pending: countByStatus.pending || 0,
      submitted: countByStatus.submitted || 0,
      approved: countByStatus.approved || 0,
      paid: countByStatus.paid || 0,
      rejected: countByStatus.rejected || 0,
      inPipeline: submittedLike,
      totalClaimed,
      totalApproved,
      totalCopay,
      rejectedAmount,
      outstandingAmount: Math.max(0, totalClaimed - totalApproved),
      avgClaimAmount: rows.length ? totalClaimed / rows.length : 0,
      approvalRate,
      nonClaimable: claims.length - rows.length,
    };
  }, [claimableClaims, claims.length]);

  const statusBreakdown = useMemo(() => {
    const map = claimableClaims.reduce<Record<string, number>>((acc, claim) => {
      acc[claim.status] = (acc[claim.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(map).map(([name, value]) => ({ name: humanize(name), value }));
  }, [claimableClaims]);

  const amountBreakdown = useMemo(() => {
    return [
      { name: "Claimed", value: Number(kpis.totalClaimed.toFixed(2)) },
      { name: "Approved", value: Number(kpis.totalApproved.toFixed(2)) },
      { name: "Copay", value: Number(kpis.totalCopay.toFixed(2)) },
      { name: "Rejected", value: Number(kpis.rejectedAmount.toFixed(2)) },
    ].filter((x) => x.value > 0);
  }, [kpis]);

  const trendData = useMemo(() => {
    const buckets = new Map<string, { date: string; claims: number; claimed: number; approved: number }>();

    claimableClaims.forEach((claim) => {
      const d = safeDate(claim.createdAt);
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      if (!buckets.has(key)) {
        buckets.set(key, {
          date: format(d, timeRange === "90d" ? "MMM d" : "MMM d"),
          claims: 0,
          claimed: 0,
          approved: 0,
        });
      }
      const row = buckets.get(key)!;
      row.claims += 1;
      row.claimed += claim.claimAmount;
      row.approved += claim.approvedAmount;
    });

    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => ({
        date: v.date,
        claims: v.claims,
        claimed: Number(v.claimed.toFixed(2)),
        approved: Number(v.approved.toFixed(2)),
      }));
  }, [claimableClaims, timeRange]);

  const recentHighValueClaims = useMemo(() => {
    return [...claimableClaims]
      .sort((a, b) => b.claimAmount - a.claimAmount)
      .slice(0, 8);
  }, [claimableClaims]);

  const getStatusIcon = (status: ClaimStatus) => {
    switch (status) {
      case "paid":
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      case "submitted":
        return <Send className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleSubmitClaim = (claim: InsuranceClaim) => {
    if (claim.status === "not_claimable") {
      toast.info("This order has no insurance amount and is not claimable.");
      return;
    }
    toast.success(`Claim ${claim.orderNumber} marked for submission workflow (UI action only).`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header controls */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Billing Documentation
            </h2>
            <p className="text-sm text-muted-foreground">
              Itemized records from pharmacy fulfillment orders, including patient and insurer-of-record amounts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => fetchClaims(true)} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {warning && (
          <Card className="border-yellow-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span>{warning}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Claimable Orders</p>
                  <p className="text-2xl font-bold">{kpis.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpis.nonClaimable} non-claimable order(s)
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">In Pipeline</p>
                  <p className="text-2xl font-bold">{kpis.inPipeline}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpis.pending} pending • {kpis.submitted} submitted
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Approved / Paid</p>
                  <p className="text-2xl font-bold">{formatMoney(kpis.totalApproved)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpis.approved} approved • {kpis.paid} paid
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-green-500/10">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Approval Rate</p>
                  <p className="text-2xl font-bold">{kpis.approvalRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Avg claim {formatMoney(kpis.avgClaimAmount)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary financial cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Claimed</p>
                  <p className="text-xl font-bold">{formatMoney(kpis.totalClaimed)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Patient Copay</p>
                  <p className="text-xl font-bold">{formatMoney(kpis.totalCopay)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding Amount</p>
                  <p className="text-xl font-bold">{formatMoney(kpis.outstandingAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">Rejected Amount</p>
                  <p className="text-xl font-bold">{formatMoney(kpis.rejectedAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Claims Trend</CardTitle>
              <CardDescription>Daily claim count and claimed/approved amounts</CardDescription>
            </CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <div className="text-sm text-muted-foreground">No claim activity in selected period.</div>
              ) : (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: any, name: string) => {
                          if (name === "claims") return [Number(value).toLocaleString(), "Claims"];
                          return [formatMoney(toNumber(value)), humanize(name)];
                        }}
                      />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="claims" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="claimed" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="approved" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Mix</CardTitle>
              <CardDescription>Claim pipeline distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {statusBreakdown.length === 0 ? (
                <div className="text-sm text-muted-foreground">No claimable orders yet.</div>
              ) : (
                <>
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82}>
                          {statusBreakdown.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-2">
                    {statusBreakdown.map((s, i) => (
                      <div key={s.name} className="flex items-center justify-between text-sm gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="truncate text-muted-foreground">{s.name}</span>
                        </div>
                        <span className="font-medium">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Amounts Breakdown</CardTitle>
              <CardDescription>Claimed, approved, copay, and rejected totals</CardDescription>
            </CardHeader>
            <CardContent>
              {amountBreakdown.length === 0 ? (
                <div className="text-sm text-muted-foreground">No amount data available.</div>
              ) : (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={amountBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: any) => [formatMoney(toNumber(v)), "Amount"]} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Largest Claims</CardTitle>
              <CardDescription>Highest-value claimable orders in selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {recentHighValueClaims.length === 0 ? (
                <div className="text-sm text-muted-foreground">No claimable orders yet.</div>
              ) : (
                <div className="space-y-3">
                  {recentHighValueClaims.map((claim) => (
                    <div key={claim.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{claim.orderNumber}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {humanize(claim.orderStatusRaw)} • {humanize(claim.paymentStatusRaw)}
                          {claim.pickupMethod ? ` • ${humanize(claim.pickupMethod)}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold">{formatMoney(claim.claimAmount)}</p>
                        <p className="text-xs text-muted-foreground">
                          approved {formatMoney(claim.approvedAmount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters + table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Superbill Ledger
                </CardTitle>
                <CardDescription>
                  Search and review superbills generated from pharmacy fulfillment orders
                </CardDescription>
              </div>

              <div className="flex gap-2">
                <div className="relative min-w-[240px]">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="Search order, claim, policy, status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ClaimStatus | "all")}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="not_claimable">Not Claimable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order / Claim</TableHead>
                    <TableHead>Provider / Policy</TableHead>
                    <TableHead>Claim Amount</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Copay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment State</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredClaims.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No claims found for the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClaims.map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{claim.orderNumber}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {claim.id.slice(0, 8)}…
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <div>{claim.insuranceProvider}</div>
                            <div className="text-xs text-muted-foreground font-mono">{claim.policyNumber}</div>
                          </div>
                        </TableCell>

                        <TableCell>{formatMoney(claim.claimAmount)}</TableCell>
                        <TableCell>{formatMoney(claim.approvedAmount)}</TableCell>
                        <TableCell>{formatMoney(claim.copayAmount)}</TableCell>
                        <TableCell>{statusBadge(claim.status)}</TableCell>
                        <TableCell className="text-muted-foreground">{humanize(claim.paymentStatusRaw)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {safeDate(claim.createdAt) ? format(new Date(claim.createdAt), "MMM d, yyyy") : "—"}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedClaim(claim);
                                setIsDetailsOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {["pending", "submitted"].includes(claim.status) && (
                              <Button size="sm" variant="outline" onClick={() => handleSubmitClaim(claim)}>
                                <Send className="h-4 w-4 mr-1" />
                                Generate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              Data source: {claims[0]?.sourceTable || "—"} • Claims are derived from pharmacy orders with insurance/coplay fields.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Claim Details
            </DialogTitle>
            <DialogDescription>
              {selectedClaim ? `${selectedClaim.orderNumber} • ${selectedClaim.id}` : "Claim details"}
            </DialogDescription>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                {getStatusIcon(selectedClaim.status)}
                {statusBadge(selectedClaim.status)}
                <Badge variant="outline">{humanize(selectedClaim.paymentStatusRaw)}</Badge>
                <Badge variant="outline">{humanize(selectedClaim.orderStatusRaw)}</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-medium">Identifiers</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Order Number</span>
                      <span className="font-medium">{selectedClaim.orderNumber}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Claim ID</span>
                      <span className="font-mono text-xs">{selectedClaim.id}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Policy Number</span>
                      <span className="font-mono text-xs">{selectedClaim.policyNumber}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Source Table</span>
                      <span>{selectedClaim.sourceTable}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-medium">Workflow Metadata</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Insurance Provider</span>
                      <span>{selectedClaim.insuranceProvider}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Priority</span>
                      <span>{selectedClaim.priority ? humanize(selectedClaim.priority) : "—"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Pickup Method</span>
                      <span>{selectedClaim.pickupMethod ? humanize(selectedClaim.pickupMethod) : "—"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Submitted At</span>
                      <span>
                        {selectedClaim.submittedAt
                          ? format(new Date(selectedClaim.submittedAt), "MMM d, yyyy h:mm a")
                          : "Not submitted"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Processed At</span>
                      <span>
                        {selectedClaim.processedAt
                          ? format(new Date(selectedClaim.processedAt), "MMM d, yyyy h:mm a")
                          : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-4">Financial Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">Claim Amount</span>
                    <span className="font-medium">{formatMoney(selectedClaim.claimAmount)}</span>
                  </div>
                  <div className="flex justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">Approved Amount</span>
                    <span className="font-medium">{formatMoney(selectedClaim.approvedAmount)}</span>
                  </div>
                  <div className="flex justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">Patient Copay</span>
                    <span className="font-medium">{formatMoney(selectedClaim.copayAmount)}</span>
                  </div>
                  <div className="flex justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">Outstanding</span>
                    <span className="font-medium">
                      {formatMoney(Math.max(0, selectedClaim.claimAmount - selectedClaim.approvedAmount))}
                    </span>
                  </div>
                </div>

                {selectedClaim.status === "not_claimable" && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    This order is not claimable because no insurance amount was recorded.
                  </div>
                )}
              </div>

              {(selectedClaim.patientId || selectedClaim.prescriptionId) && (
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-3">Linked Records</h4>
                  <div className="space-y-2 text-sm">
                    {selectedClaim.patientId && (
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Patient ID</span>
                        <span className="font-mono text-xs">{selectedClaim.patientId}</span>
                      </div>
                    )}
                    {selectedClaim.prescriptionId && (
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Prescription ID</span>
                        <span className="font-mono text-xs">{selectedClaim.prescriptionId}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
            {selectedClaim && ["pending", "submitted"].includes(selectedClaim.status) && (
              <Button onClick={() => handleSubmitClaim(selectedClaim)}>
                <Send className="h-4 w-4 mr-1" />
                Generate Superbill
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
