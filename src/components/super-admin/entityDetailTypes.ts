import { Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

export type EntityType = "clinic" | "pharmacy" | "laboratory" | "imaging" | "doctors" | "practices" | "patients" | "appointments" | "payments";

export type InsightData = {
  entity_type: string;
  entity_id: string;
  analytics: {
    total_orders: number;
    active_staff: number;
    revenue_cents: number;
    currency: string;
  };
  billing: {
    subscription:
      | {
          id: string;
          status: string;
          started_at: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          plan: {
            id: string;
            code: string;
            name: string;
            description: string | null;
            interval: "month" | "year";
            amount_cents: number;
            currency: string;
            is_active: boolean;
          };
        }
      | null;
    invoices: Array<{
      id: string;
      status: string;
      currency: string;
      amount_due_cents: number;
      amount_paid_cents: number;
      period_start: string | null;
      period_end: string | null;
      due_at: string | null;
      created_at: string;
    }>;
    transactions: Array<{
      id: string;
      status: string;
      transaction_type: string;
      currency: string;
      amount_cents: number;
      provider: string;
      provider_ref: string | null;
      created_at: string;
    }>;
  };
};

export const STATUS_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800", icon: Clock },
  completed: { label: "Paid", className: "bg-green-100 text-green-800", icon: CheckCircle2 },
  failed: { label: "Failed", className: "bg-red-100 text-red-800", icon: XCircle },
  refunded: { label: "Refunded", className: "bg-gray-100 text-gray-800", icon: RefreshCw },
};

export const SUB_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  inactive: { label: "Inactive", className: "bg-gray-100 text-gray-800" },
  trialing: { label: "Trial", className: "bg-blue-100 text-blue-800" },
  active: { label: "Active", className: "bg-green-100 text-green-800" },
  past_due: { label: "Past Due", className: "bg-yellow-100 text-yellow-800" },
  canceled: { label: "Canceled", className: "bg-gray-100 text-gray-800" },
  unpaid: { label: "Unpaid", className: "bg-red-100 text-red-800" },
};

export function formatCurrency(amountCents: number, currency: string = "USD") {
  const value = Number(amountCents || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: String(currency || "USD").toUpperCase(),
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export function toIsoDate(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString();
}

export function mapEntityTypeToSettings(t: EntityType): "clinic" | "lab" | "imaging" | "pharmacy" | null {
  if (t === "laboratory") return "lab";
  if (t === "clinic" || t === "practices") return "clinic";
  if (t === "pharmacy") return "pharmacy";
  if (t === "imaging") return "imaging";
  return null;
}

export function planStaffLimit(planCode?: string | null) {
  const code = String(planCode || "").toLowerCase();
  if (!code) return null;
  if (code.includes("enterprise")) return null;
  if (code.includes("pro")) return 50;
  if (code.includes("team") || code.includes("business")) return 25;
  if (code.includes("basic")) return 10;
  if (code.includes("free")) return 5;
  return 10;
}
