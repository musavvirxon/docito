/**
 * File: src/components/doctor/DoctorReferralsSection.tsx
 *
 * Full redesign of the doctor referrals dashboard section.
 * Features:
 *  - KPI stats row (Sent / Received / Pending / Completed) via doctor-referral-stats edge function
 *  - "Sent by me" / "Received" tab split
 *  - Search by patient name + status filter chips + priority filter
 *  - Rich referral rows with status colour-coding and quick actions
 *  - Patient picker → Create referral dialog (preserved from original logic)
 *  - PDF download, View details, Accept / Decline / Complete actions
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  ArrowRightLeft,
  ArrowUpRight,
  Calendar,
  CalendarPlus,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileDown,
  Loader2,
  Search,
  Send,
  Users,
  X,
  XCircle,
  Inbox,
} from "lucide-react";
import ManualBookAppointmentModal from "@/components/doctor/ManualBookAppointmentModal";
import type { Patient as BookingPatient } from "@/components/patient/PatientSelector";
import { format } from "date-fns";

import { CreateReferralDialog } from "@/components/referrals";
import { useDoctorData } from "@/contexts/DoctorDataContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { useReferrals, useReferralActions, type Referral } from "@/hooks/useReferrals";
import { useAuth } from "@/contexts/AuthContext";
import { canCreateReferrals } from "@/lib/referrals/permissions";
import {
  downloadReferralPdf,
  getReferralTypeLabel,
  getReferralPatientDisplayName,
  isReferralValid,
} from "@/lib/api/referral-api";

// ─── Types ────────────────────────────────────────────────────────────────────

type RegisteredPatient = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  type: "registered";
};

type DoctorMadePatient = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string;
  type: "doctor_made";
};

type PatientResult = RegisteredPatient | DoctorMadePatient;

type ReferralStats = {
  total_sent: number;
  total_received: number;
  pending_sent: number;
  pending_received: number;
  completed: number;
  rejected: number;
  this_month_sent: number;
  this_month_received: number;
};

type StatusFilter =
  | "all"
  | "sent"
  | "accepted"
  | "completed"
  | "rejected"
  | "booked"
  | "expired";
type PriorityFilter = "all" | "routine" | "urgent" | "stat";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (["completed"].includes(s))
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/50";
  if (["accepted", "slots_available", "booked", "in_progress"].includes(s))
    return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50";
  if (["rejected", "cancelled", "expired"].includes(s))
    return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-200/50 dark:border-red-800/50";
  if (["sent"].includes(s))
    return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/50";
  return "bg-muted text-muted-foreground border-border";
}

function priorityDotClass(priority: string): string {
  if (priority === "stat") return "bg-red-500";
  if (priority === "urgent") return "bg-amber-500";
  return "bg-slate-400";
}

function formatStatus(s: string) {
  return s.replace(/_/g, " ");
}

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "booked", label: "Booked" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Declined" },
  { value: "expired", label: "Expired" },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  loading,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  loading?: boolean;
}) {
  return (
    <Card className="overflow-hidden border border-border/60 bg-card hover:shadow-sm transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {label}
            </p>
            {loading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
            )}
            {sub && !loading && (
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            )}
          </div>
          <div className={cn("p-2.5 rounded-xl flex-shrink-0", accent)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Referral Row ─────────────────────────────────────────────────────────────

function ReferralRow({
  referral,
  role,
  onAccept,
  onReject,
  onComplete,
  onViewDetails,
}: {
  referral: Referral;
  role: "referrer" | "receiver";
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onComplete: (id: string) => void;
  onViewDetails: (r: Referral) => void;
}) {
  useAuth();
  // PDF locale follows UI language (resolved inside downloadReferralPdf)
  const status = String(referral.status ?? "");
  const isValid = isReferralValid(referral);
  const patientName = getReferralPatientDisplayName(referral);

  const canAccept = role === "receiver" && status === "sent";
  const canReject =
    role === "receiver" && ["sent", "accepted"].includes(status);
  const canComplete =
    role === "receiver" && ["booked", "in_progress"].includes(status);

  const handleDownload = async () => {
    try {
      await downloadReferralPdf({ referralId: referral.id });
    } catch (e: any) {
      toast.error(e?.message ?? "PDF download failed");
    }
  };

  return (
    <div
      className={cn(
        "group flex flex-col sm:flex-row items-start sm:items-center gap-4 px-4 py-3.5 rounded-lg border border-border/50 bg-card hover:bg-muted/30 hover:border-border transition-all duration-150",
        !isValid && "opacity-60"
      )}
    >
      {/* Left: priority dot + patient + type */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span
          className={cn(
            "h-2 w-2 rounded-full flex-shrink-0",
            priorityDotClass(referral.priority)
          )}
          title={`Priority: ${referral.priority}`}
        />

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{patientName}</span>
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
                statusBadgeClass(status)
              )}
            >
              {formatStatus(status)}
            </span>
            {!isValid && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border bg-muted text-muted-foreground border-border">
                expired
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground">
              {getReferralTypeLabel(referral.referral_type_enum ?? "consultation")}
            </p>
            <span className="text-muted-foreground/40 text-xs">•</span>
            <p className="text-xs text-muted-foreground font-mono">
              {referral.referral_number}
            </p>
          </div>
        </div>
      </div>

      {/* Middle: dates */}
      <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
        <Calendar className="h-3.5 w-3.5" />
        <span>
          {format(new Date(referral.valid_from), "MMM d")} –{" "}
          {format(new Date(referral.valid_until), "MMM d, yyyy")}
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 text-xs"
          onClick={handleDownload}
        >
          <FileDown className="h-3.5 w-3.5 mr-1" />
          PDF
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 text-xs"
          onClick={() => onViewDetails(referral)}
        >
          Details
        </Button>

        {canAccept && (
          <Button
            size="sm"
            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => onAccept(referral.id)}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Accept
          </Button>
        )}

        {canReject && (
          <Button
            variant="destructive"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => onReject(referral.id)}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Decline
          </Button>
        )}

        {canComplete && (
          <Button
            variant="secondary"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => onComplete(referral.id)}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Complete
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Referral List Panel ──────────────────────────────────────────────────────

function ReferralListPanel({
  referrals,
  loading,
  role,
  onAccept,
  onReject,
  onComplete,
  onViewDetails,
}: {
  referrals: Referral[];
  loading: boolean;
  role: "referrer" | "receiver";
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onComplete: (id: string) => void;
  onViewDetails: (r: Referral) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2 mt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border/50 px-4 py-3.5">
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (!referrals.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
          <Inbox className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm">No referrals found</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {role === "referrer"
              ? "Referrals you send to other providers will appear here."
              : "Referrals from other doctors will appear here."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-2">
      {referrals.map((r) => (
        <ReferralRow
          key={r.id}
          referral={r}
          role={role}
          onAccept={onAccept}
          onReject={onReject}
          onComplete={onComplete}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}

// ─── Details Dialog ───────────────────────────────────────────────────────────

function ReferralDetailsDialog({
  referral,
  open,
  onOpenChange,
}: {
  referral: Referral | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  if (!referral) return null;

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: "Number",
      value: <span className="font-mono text-sm">{referral.referral_number}</span>,
    },
    {
      label: "Status",
      value: (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize",
            statusBadgeClass(String(referral.status ?? ""))
          )}
        >
          {formatStatus(String(referral.status ?? ""))}
        </span>
      ),
    },
    {
      label: "Type",
      value: getReferralTypeLabel(referral.referral_type_enum ?? "consultation"),
    },
    { label: "Priority", value: <span className="capitalize">{referral.priority}</span> },
    { label: "Patient", value: getReferralPatientDisplayName(referral) },
    {
      label: "Valid",
      value: `${format(new Date(referral.valid_from), "MMM d, yyyy")} → ${format(
        new Date(referral.valid_until),
        "MMM d, yyyy"
      )}`,
    },
    {
      label: "Duration",
      value: `${referral.estimated_duration_minutes ?? 30} min`,
    },
  ];

  if (referral.preferred_date) {
    rows.push({
      label: "Preferred date",
      value: format(new Date(referral.preferred_date), "MMMM d, yyyy"),
    });
  }

  if (referral.rejection_reason) {
    rows.push({ label: "Decline reason", value: referral.rejection_reason });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Referral Details</DialogTitle>
          <DialogDescription>{referral.referral_number}</DialogDescription>
        </DialogHeader>

        <div className="space-y-0">
          {rows.map(({ label, value }) => (
            <div
              key={label}
              className="flex items-start gap-2 py-2 border-b border-border/40 last:border-0"
            >
              <span className="text-xs text-muted-foreground w-28 flex-shrink-0 pt-0.5">
                {label}
              </span>
              <span className="text-sm flex-1">{value}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3 pt-1">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Reason</p>
            <p className="text-sm bg-muted/50 rounded-md p-3">{referral.reason}</p>
          </div>
          {referral.clinical_notes && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Clinical Notes</p>
              <p className="text-sm bg-muted/50 rounded-md p-3">{referral.clinical_notes}</p>
            </div>
          )}
          {referral.diagnosis_codes && referral.diagnosis_codes.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Diagnosis Codes</p>
              <div className="flex flex-wrap gap-1">
                {referral.diagnosis_codes.map((code, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-mono">
                    {code}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reject Dialog ────────────────────────────────────────────────────────────

function RejectDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Decline Referral</DialogTitle>
          <DialogDescription>
            Please provide a reason for declining this referral.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <textarea
            className="w-full min-h-[100px] p-3 border border-input rounded-md resize-none bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Reason for declining..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim()}
              onClick={() => onConfirm(reason)}
            >
              Decline Referral
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Patient Picker Dialog ────────────────────────────────────────────────────

function PatientPickerDialog({
  open,
  onOpenChange,
  doctorId,
  onContinue,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  doctorId: string | undefined;
  onContinue: (patient: PatientResult) => void;
}) {
  const [activeTab, setActiveTab] = useState<"registered" | "doctor_made">("registered");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [registeredResults, setRegisteredResults] = useState<RegisteredPatient[]>([]);
  const [doctorMadeResults, setDoctorMadeResults] = useState<DoctorMadePatient[]>([]);
  const [selected, setSelected] = useState<PatientResult | null>(null);

  useEffect(() => {
    if (!open) {
      setQ("");
      setRegisteredResults([]);
      setDoctorMadeResults([]);
      setSelected(null);
      setLoading(false);
      setActiveTab("registered");
    }
  }, [open]);

  useEffect(() => {
    if (open && doctorId) loadDoctorPatients();
  }, [open, doctorId]);

  const loadDoctorPatients = async () => {
    if (!doctorId) return;
    try {
      const { data, error } = await supabase
        .from("doctor_patients")
        .select("id, full_name, email, phone, date_of_birth")
        .eq("doctor_id", doctorId)
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      setDoctorMadeResults(
        (data ?? []).map((p: any) => ({
          id: p.id,
          full_name: p.full_name || "Unknown",
          email: p.email ?? null,
          phone: p.phone ?? null,
          date_of_birth: p.date_of_birth,
          type: "doctor_made" as const,
        }))
      );
    } catch (e) {
      console.error("load doctor patients:", e);
    }
  };

  const runSearch = async () => {
    if (q.trim().length < 2) return;
    setLoading(true);
    try {
      const term = q.trim();
      const { data: rData } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone")
        .eq("role", "patient")
        .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
        .limit(10);
      setRegisteredResults(
        (rData ?? []).map((p: any) => ({
          id: p.user_id,
          full_name: p.full_name || "Unknown",
          email: p.email ?? null,
          phone: p.phone ?? null,
          type: "registered" as const,
        }))
      );

      if (doctorId) {
        const { data: dData } = await supabase
          .from("doctor_patients")
          .select("id, full_name, email, phone, date_of_birth")
          .eq("doctor_id", doctorId)
          .eq("status", "active")
          .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
          .limit(10);
        setDoctorMadeResults(
          (dData ?? []).map((p: any) => ({
            id: p.id,
            full_name: p.full_name || "Unknown",
            email: p.email ?? null,
            phone: p.phone ?? null,
            date_of_birth: p.date_of_birth,
            type: "doctor_made" as const,
          }))
        );
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const currentList = activeTab === "registered" ? registeredResults : doctorMadeResults;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Patient</DialogTitle>
          <DialogDescription>
            Choose a patient to create a referral for.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "registered" | "doctor_made")}
        >
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="registered" className="text-xs gap-1.5">
              <Users className="h-3.5 w-3.5" /> Registered
            </TabsTrigger>
            <TabsTrigger value="doctor_made" className="text-xs gap-1.5">
              <Users className="h-3.5 w-3.5" /> Your Patients ({doctorMadeResults.length})
            </TabsTrigger>
          </TabsList>

          <div className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, email, or phone…"
                className="pl-9 h-9 text-sm"
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
              />
            </div>
            <Button
              size="sm"
              onClick={runSearch}
              disabled={q.trim().length < 2 || loading}
              className="h-9"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>

          <ScrollArea className="h-56 mt-3 -mx-1 px-1">
            <div className="space-y-1.5">
              {currentList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {activeTab === "registered"
                    ? q.trim().length < 2
                      ? "Type at least 2 characters to search."
                      : "No registered patients found."
                    : "No patients found."}
                </p>
              ) : (
                currentList.map((p) => {
                  const isSelected = selected?.id === p.id && selected?.type === p.type;
                  return (
                    <button
                      key={`${p.type}-${p.id}`}
                      onClick={() => setSelected(p)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all duration-100",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border/50 bg-card hover:bg-muted/50 hover:border-border"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{p.full_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {[p.email, p.phone].filter(Boolean).join(" • ")}
                          </p>
                        </div>
                        <Badge
                          variant={p.type === "registered" ? "secondary" : "outline"}
                          className="text-[10px] ml-2"
                        >
                          {p.type === "registered" ? "Registered" : "Your patient"}
                        </Badge>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!selected} onClick={() => selected && onContinue(selected)}>
            Continue
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DoctorReferralsSection() {
  const { t } = useTranslation("dashboard");
  const { doctorProfile } = useDoctorData();
  const { createReferral, sendReferral, acceptReferral, rejectReferral, completeReferral } =
    useReferralActions();
  const { allRoles } = useAuth();
  const uiCanCreate = canCreateReferrals(allRoles);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!doctorProfile?.id) return;
    try {
      setStatsLoading(true);
      const { data, error } = await supabase.functions.invoke("doctor-referral-stats", {
        body: { doctor_id: doctorProfile.id },
      });
      if (error) throw error;
      if (data?.ok) setStats(data.stats as ReferralStats);
    } catch (e) {
      console.error("stats error:", e);
    } finally {
      setStatsLoading(false);
    }
  }, [doctorProfile?.id]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ── Referral data ─────────────────────────────────────────────────────────────
  const {
    referrals: sentReferrals,
    loading: sentLoading,
    refetch: refetchSent,
  } = useReferrals({
    role: "referrer",
    entityType: "doctor",
    entityId: doctorProfile?.id,
  });

  const {
    referrals: receivedReferrals,
    loading: receivedLoading,
    refetch: refetchReceived,
  } = useReferrals({
    role: "receiver",
    entityType: "doctor",
    entityId: doctorProfile?.id,
  });

  const refetchAll = useCallback(() => {
    refetchSent();
    refetchReceived();
    loadStats();
  }, [refetchSent, refetchReceived, loadStats]);

  // ── Filters ───────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");

  const filterReferrals = useCallback(
    (list: Referral[]) => {
      let out = list;
      if (search.trim()) {
        const q = search.toLowerCase();
        out = out.filter(
          (r) =>
            getReferralPatientDisplayName(r).toLowerCase().includes(q) ||
            r.referral_number.toLowerCase().includes(q) ||
            r.reason.toLowerCase().includes(q)
        );
      }
      if (statusFilter !== "all") {
        out = out.filter((r) => String(r.status ?? "") === statusFilter);
      }
      if (priorityFilter !== "all") {
        out = out.filter((r) => r.priority === priorityFilter);
      }
      return out;
    },
    [search, statusFilter, priorityFilter]
  );

  const filteredSent = useMemo(
    () => filterReferrals(sentReferrals),
    [filterReferrals, sentReferrals]
  );
  const filteredReceived = useMemo(
    () => filterReferrals(receivedReferrals),
    [filterReferrals, receivedReferrals]
  );

  const hasActiveFilters = search || statusFilter !== "all" || priorityFilter !== "all";

  // ── Dialog state ──────────────────────────────────────────────────────────────
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [focusedReferral, setFocusedReferral] = useState<Referral | null>(null);

  const handleViewDetails = (r: Referral) => {
    setFocusedReferral(r);
    setDetailsOpen(true);
  };

  const handleAccept = async (id: string) => {
    const result = await acceptReferral(id);
    if (result.success) refetchAll();
  };

  const handleRejectClick = (id: string) => {
    const r = [...sentReferrals, ...receivedReferrals].find((x) => x.id === id);
    setFocusedReferral(r ?? null);
    setRejectOpen(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!focusedReferral) return;
    const result = await rejectReferral(focusedReferral.id, reason);
    if (result.success) {
      setRejectOpen(false);
      refetchAll();
    }
  };

  const handleComplete = async (id: string) => {
    const result = await completeReferral(id);
    if (result.success) refetchAll();
  };

  const handlePatientSelected = (patient: PatientResult) => {
    setSelectedPatient(patient);
    setPickerOpen(false);
    setCreateOpen(true);
  };

  const handleCreateSubmit = async (data: any) => {
    if (!uiCanCreate || !doctorProfile?.id || !selectedPatient) return;
    const isDoctorMade = selectedPatient.type === "doctor_made";
    const referralData = {
      ...data,
      ...(isDoctorMade
        ? {
            doctor_patient_id: selectedPatient.id,
            patient_id: null,
            patient_name: selectedPatient.full_name ?? null,
            patient_phone: (selectedPatient as any).phone ?? null,
            patient_email: (selectedPatient as any).email ?? null,
          }
        : {}),
    };
    const result = await createReferral(referralData, "doctor", doctorProfile.id);
    if (result.success && result.data) {
      const referralId = result.data.id;
      await sendReferral(referralId);

      // Non-critical: notification + PDF download in parallel
      // Only notify when the patient has a registered account (has a real patient_id).
      if (!isDoctorMade) {
        try {
          await supabase.functions.invoke("referral-notify", {
            body: { referral_id: referralId, event: "sent" },
          });
        } catch {
          // non-critical
        }
      }

      // Auto-download the referral PDF after creation
      try {
        await downloadReferralPdf({
          referralId,
          fileName: `referral-${result.data.referral_number || referralId.slice(0, 8)}`,
        });
      } catch {
        // non-critical — PDF download failure should not block the success flow
      }

      toast.success("Referral created and sent — PDF downloaded");
      refetchAll();
    } else {
      toast.error((result as any).error || "Failed to create referral");
    }
  };

  if (!doctorProfile) return null;

  const pendingActionCount = (stats?.pending_received ?? 0) + (stats?.pending_sent ?? 0);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Referrals</h2>
            <p className="text-sm text-muted-foreground">
              Manage patient referrals you've sent and received
            </p>
          </div>
        </div>

        {uiCanCreate && (
          <Button onClick={() => setPickerOpen(true)} size="sm" className="gap-2">
            <Send className="h-4 w-4" />
            New Referral
          </Button>
        )}
      </div>

      {/* ── KPI Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Sent"
          value={stats?.total_sent ?? 0}
          sub={`${stats?.this_month_sent ?? 0} this month`}
          icon={Send}
          accent="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          loading={statsLoading}
        />
        <StatCard
          label="Total Received"
          value={stats?.total_received ?? 0}
          sub={`${stats?.this_month_received ?? 0} this month`}
          icon={Inbox}
          accent="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          loading={statsLoading}
        />
        <StatCard
          label="Pending Action"
          value={pendingActionCount}
          sub="requires your attention"
          icon={Clock}
          accent={
            pendingActionCount > 0
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "bg-muted text-muted-foreground"
          }
          loading={statsLoading}
        />
        <StatCard
          label="Completed"
          value={stats?.completed ?? 0}
          sub={`${stats?.rejected ?? 0} declined`}
          icon={CheckCircle}
          accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          loading={statsLoading}
        />
      </div>

      {/* ── Main Panel ─────────────────────────────────────────────────────── */}
      <div className="border border-border/60 rounded-xl bg-card overflow-hidden">
        {/* Filter bar */}
        <div className="px-4 pt-4 pb-3 border-b border-border/50 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by patient, number, or reason…"
                className="pl-9 h-9 text-sm bg-background"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Priority filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 gap-1.5 text-xs",
                    priorityFilter !== "all" && "border-primary text-primary"
                  )}
                >
                  Priority:{" "}
                  <span className="capitalize font-medium">{priorityFilter}</span>
                  <ChevronDown className="h-3 w-3 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {(["all", "routine", "urgent", "stat"] as PriorityFilter[]).map((p) => (
                  <DropdownMenuItem
                    key={p}
                    onClick={() => setPriorityFilter(p)}
                    className={cn(
                      "text-xs capitalize",
                      priorityFilter === p && "font-semibold text-primary"
                    )}
                  >
                    {p === "all" ? "All priorities" : p}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Status chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-100 border",
                  statusFilter === value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}

            {hasActiveFilters && (
              <>
                <Separator orientation="vertical" className="h-4 mx-1" />
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                  }}
                  className="px-2.5 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground border border-border hover:border-destructive/40 hover:bg-destructive/5 transition-all flex items-center gap-1 whitespace-nowrap"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sent / Received tabs */}
        <Tabs defaultValue="sent" className="px-4 pb-4">
          <TabsList className="h-9 bg-muted/50 mt-3">
            <TabsTrigger value="sent" className="text-xs gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Sent by me
              {sentReferrals.length > 0 && (
                <span className="ml-1 text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                  {sentReferrals.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="received" className="text-xs gap-1.5">
              <Inbox className="h-3.5 w-3.5" />
              Received
              {receivedReferrals.length > 0 && (
                <span className="ml-1 text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                  {receivedReferrals.length}
                </span>
              )}
              {(stats?.pending_received ?? 0) > 0 && (
                <span className="ml-1 text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-semibold">
                  {stats!.pending_received}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sent" className="mt-0">
            <ReferralListPanel
              referrals={filteredSent}
              loading={sentLoading}
              role="referrer"
              onAccept={handleAccept}
              onReject={handleRejectClick}
              onComplete={handleComplete}
              onViewDetails={handleViewDetails}
            />
          </TabsContent>

          <TabsContent value="received" className="mt-0">
            <ReferralListPanel
              referrals={filteredReceived}
              loading={receivedLoading}
              role="receiver"
              onAccept={handleAccept}
              onReject={handleRejectClick}
              onComplete={handleComplete}
              onViewDetails={handleViewDetails}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      <PatientPickerDialog
        open={pickerOpen}
        onOpenChange={(o) => {
          if (!uiCanCreate && o) {
            toast.error("Your account cannot create referrals");
            return;
          }
          setPickerOpen(o);
        }}
        doctorId={doctorProfile.id}
        onContinue={handlePatientSelected}
      />

      {selectedPatient && (
        <CreateReferralDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          patientId={selectedPatient.id}
          patientName={selectedPatient.full_name}
          onSubmit={handleCreateSubmit}
        />
      )}

      <ReferralDetailsDialog
        referral={focusedReferral}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={handleRejectConfirm}
      />
    </div>
  );
}
