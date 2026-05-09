// File: src/components/doctor/prescriptions/DoctorPrescriptionsSection.tsx
// Doctor dashboard "Prescriptions" section — shows every prescription this doctor has
// ever written (from appointments, visits, patient detail, or this section), plus a
// creator panel and per-row detail view.

import { useEffect, useMemo, useState } from "react";
import { format, isThisMonth, addDays, isAfter, isBefore } from "date-fns";
import {
  Pill,
  Plus,
  Search,
  RotateCcw,
  Eye,
  CalendarDays,
  Send,
  Download,
  X,
  Trash2,
  FileText,
  ChevronRight,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import { useDoctorData } from "@/contexts/DoctorDataContext";
import { useDoctorPatients } from "@/hooks/useDoctorPatients";
import {
  usePrescriptions,
  type Prescription,
  type PrescriptionItem,
} from "@/hooks/usePrescriptions";
import { downloadPrescriptionPdf } from "@/lib/api/prescription-api";
import { supabase } from "@/integrations/supabase/client";

// ──────────────────────────────────────────────────────────────────────────────
// Constants

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  sent_to_pharmacy: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  ready: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  fulfilled: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-muted text-muted-foreground",
};

const FREQUENCIES = [
  { value: "once_daily", label: "Once daily" },
  { value: "twice_daily", label: "Twice daily" },
  { value: "three_times_daily", label: "Three times daily" },
  { value: "four_times_daily", label: "Four times daily" },
  { value: "every_6_hours", label: "Every 6 hours" },
  { value: "every_8_hours", label: "Every 8 hours" },
  { value: "every_12_hours", label: "Every 12 hours" },
  { value: "as_needed", label: "As needed (PRN)" },
  { value: "weekly", label: "Once weekly" },
];

const UNITS = [
  { value: "tablets", label: "Tablets" },
  { value: "capsules", label: "Capsules" },
  { value: "ml", label: "mL" },
  { value: "mg", label: "mg" },
  { value: "drops", label: "Drops" },
  { value: "puffs", label: "Puffs" },
  { value: "patches", label: "Patches" },
];

type DateRange = "all" | "week" | "month" | "3months";
type RightPanel = "creator" | "detail" | "empty";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers

const formatStatus = (s: string) => s.replace(/_/g, " ");

const initialItem = (): Partial<PrescriptionItem> => ({
  medication_name: "",
  dosage: "",
  frequency: "once_daily",
  quantity: 30,
  unit: "tablets",
  instructions: "",
  substitutions_allowed: true,
});

// ──────────────────────────────────────────────────────────────────────────────
// Main component

export default function DoctorPrescriptionsSection() {
  const { doctorProfile } = useDoctorData();
  const doctorId = doctorProfile?.id as string | undefined;
  const { patients } = useDoctorPatients();

  const { prescriptions, loading, createPrescription, sendToPharmacy, fetchPrescriptions } =
    usePrescriptions({ doctorId });

  // UI state
  const [search, setSearch] = useState("");
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");

  const [selectedRxId, setSelectedRxId] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>("empty");

  // Creator pre-fill
  const [prefilledPatientId, setPrefilledPatientId] = useState<string>("");
  const [prefilledItems, setPrefilledItems] = useState<Partial<PrescriptionItem>[]>([]);

  // Mobile sheet
  const [sheetOpen, setSheetOpen] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const total = prescriptions.length;
    const active = prescriptions.filter((p) =>
      ["pending", "sent_to_pharmacy", "processing"].includes(p.status),
    ).length;
    const fulfilledMonth = prescriptions.filter(
      (p) => p.status === "fulfilled" && p.prescribed_at && isThisMonth(new Date(p.prescribed_at)),
    ).length;
    const expiringSoon = prescriptions.filter((p) => {
      if (!p.expires_at) return false;
      if (["fulfilled", "cancelled", "expired"].includes(p.status)) return false;
      const exp = new Date(p.expires_at);
      return isAfter(exp, new Date()) && isBefore(exp, addDays(new Date(), 14));
    }).length;
    return { total, active, fulfilledMonth, expiringSoon };
  }, [prescriptions]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prescriptions.filter((p) => {
      if (patientFilter !== "all" && p.patient_id !== patientFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;

      if (dateRange !== "all" && p.prescribed_at) {
        const d = new Date(p.prescribed_at);
        const now = new Date();
        const cutoff =
          dateRange === "week"
            ? addDays(now, -7)
            : dateRange === "month"
              ? addDays(now, -30)
              : addDays(now, -90);
        if (isBefore(d, cutoff)) return false;
      }

      if (q) {
        const inNumber = (p.prescription_number || "").toLowerCase().includes(q);
        const inMeds = (p.items || []).some((it) =>
          (it.medication_name || "").toLowerCase().includes(q),
        );
        if (!inNumber && !inMeds) return false;
      }
      return true;
    });
  }, [prescriptions, search, patientFilter, statusFilter, dateRange]);

  // Unique patients in the list (for filter)
  const patientOptions = useMemo(() => {
    const map = new Map<string, string>();
    prescriptions.forEach((p) => {
      const name = p.patient?.full_name || p.patient_id;
      if (p.patient_id) map.set(p.patient_id, name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [prescriptions]);

  // Medication history (derived)
  const medicationHistory = useMemo(() => {
    const map = new Map<
      string,
      { name: string; count: number; lastDate: string; lastItem: PrescriptionItem }
    >();
    prescriptions.forEach((rx) => {
      (rx.items || []).forEach((item) => {
        const key = (item.medication_name || "").toLowerCase().trim();
        if (!key) return;
        const existing = map.get(key);
        if (!existing) {
          map.set(key, {
            name: item.medication_name,
            count: 1,
            lastDate: rx.prescribed_at,
            lastItem: item,
          });
        } else {
          existing.count += 1;
          if (rx.prescribed_at > existing.lastDate) {
            existing.lastDate = rx.prescribed_at;
            existing.lastItem = item;
          }
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [prescriptions]);

  // Last 5 unique recently prescribed medications (for "From previous" strip)
  const recentMedications = useMemo(() => {
    const seen = new Set<string>();
    const out: PrescriptionItem[] = [];
    for (const rx of prescriptions) {
      for (const item of rx.items || []) {
        const key = (item.medication_name || "").toLowerCase().trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(item);
        if (out.length >= 5) return out;
      }
    }
    return out;
  }, [prescriptions]);

  const selectedRx = useMemo(
    () => prescriptions.find((p) => p.id === selectedRxId) || null,
    [prescriptions, selectedRxId],
  );

  // Handlers
  const openCreator = (opts?: {
    patientId?: string;
    items?: Partial<PrescriptionItem>[];
  }) => {
    setPrefilledPatientId(opts?.patientId ?? "");
    setPrefilledItems(opts?.items ?? []);
    setSelectedRxId(null);
    setRightPanel("creator");
    setSheetOpen(true);
  };

  const openDetail = (rxId: string) => {
    setSelectedRxId(rxId);
    setRightPanel("detail");
    setSheetOpen(true);
  };

  const handleRePrescribe = (rx: Prescription) => {
    openCreator({
      patientId: rx.patient_id,
      items: (rx.items || []).map((it) => ({
        medication_name: it.medication_name,
        medication_code: it.medication_code,
        dosage: it.dosage,
        frequency: it.frequency,
        quantity: it.quantity,
        unit: it.unit,
        instructions: it.instructions,
        substitutions_allowed: it.substitutions_allowed,
      })),
    });
  };

  const handleClearFilters = () => {
    setSearch("");
    setPatientFilter("all");
    setStatusFilter("all");
    setDateRange("all");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (!doctorId) return null;

  const hasFilters =
    search !== "" ||
    patientFilter !== "all" ||
    statusFilter !== "all" ||
    dateRange !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10">
            <Pill className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Prescriptions</h2>
            <p className="text-sm text-muted-foreground">
              Every prescription you've written, in one place
            </p>
          </div>
        </div>
        <Button onClick={() => openCreator()}>
          <Plus className="h-4 w-4 mr-2" />
          New Prescription
        </Button>
      </div>

      {/* Stat chips */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        <StatChip label="Total Rx" value={stats.total} />
        <StatChip label="Active" value={stats.active} />
        <StatChip label="Fulfilled this month" value={stats.fulfilledMonth} />
        <StatChip
          label="Expiring soon"
          value={stats.expiringSoon}
          accent={stats.expiringSoon > 0}
        />
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT PANEL */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search + filters */}
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search medication or Rx number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={patientFilter} onValueChange={setPatientFilter}>
                  <SelectTrigger className="h-9 w-auto min-w-[140px]">
                    <SelectValue placeholder="Patient" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All patients</SelectItem>
                    {patientOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-auto min-w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sent_to_pharmacy">Sent to pharmacy</SelectItem>
                    <SelectItem value="fulfilled">Fulfilled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                  <SelectTrigger className="h-9 w-auto min-w-[140px]">
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="week">This week</SelectItem>
                    <SelectItem value="month">This month</SelectItem>
                    <SelectItem value="3months">Last 3 months</SelectItem>
                  </SelectContent>
                </Select>

                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    <X className="h-3.5 w-3.5 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Prescription rows */}
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : prescriptions.length === 0 ? (
            <EmptyState onCreate={() => openCreator()} />
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  No prescriptions match your filters
                </p>
                <Button variant="link" size="sm" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="max-h-[60vh] pr-2">
              <div className="space-y-2">
                {filtered.map((rx) => (
                  <PrescriptionRow
                    key={rx.id}
                    rx={rx}
                    selected={rx.id === selectedRxId}
                    onView={() => openDetail(rx.id)}
                    onRePrescribe={() => handleRePrescribe(rx)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Medication history */}
          {medicationHistory.length > 0 && (
            <MedicationHistoryPanel
              items={medicationHistory}
              onPick={(it) => openCreator({ items: [it] })}
            />
          )}
        </div>

        {/* RIGHT PANEL — desktop */}
        <div className="hidden lg:block lg:col-span-3">
          <Card className="sticky top-4">
            <CardContent className="p-4">
              {rightPanel === "creator" || rightPanel === "empty" ? (
                <CreatorPanel
                  doctorId={doctorId}
                  patients={patients}
                  recentMedications={recentMedications}
                  prefilledPatientId={prefilledPatientId}
                  prefilledItems={prefilledItems}
                  createPrescription={createPrescription}
                  onCreated={(rxId) => {
                    setRightPanel("detail");
                    setSelectedRxId(rxId);
                    fetchPrescriptions();
                  }}
                />
              ) : selectedRx ? (
                <DetailPanel
                  rx={selectedRx}
                  onClose={() => setRightPanel("creator")}
                  onRePrescribe={() => handleRePrescribe(selectedRx)}
                  sendToPharmacy={sendToPharmacy}
                  refresh={fetchPrescriptions}
                />
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* RIGHT PANEL — mobile sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto lg:hidden">
          <SheetHeader>
            <SheetTitle>
              {rightPanel === "detail" ? "Prescription details" : "New prescription"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {rightPanel === "creator" || rightPanel === "empty" ? (
              <CreatorPanel
                doctorId={doctorId}
                patients={patients}
                recentMedications={recentMedications}
                prefilledPatientId={prefilledPatientId}
                prefilledItems={prefilledItems}
                createPrescription={createPrescription}
                onCreated={(rxId) => {
                  setRightPanel("detail");
                  setSelectedRxId(rxId);
                  fetchPrescriptions();
                }}
              />
            ) : selectedRx ? (
              <DetailPanel
                rx={selectedRx}
                onClose={() => setSheetOpen(false)}
                onRePrescribe={() => handleRePrescribe(selectedRx)}
                sendToPharmacy={sendToPharmacy}
                refresh={fetchPrescriptions}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <Card className="min-w-[140px] flex-shrink-0">
      <CardContent className="p-3">
        <div
          className={cn(
            "text-2xl font-semibold",
            accent ? "text-amber-500" : "text-foreground",
          )}
        >
          {value}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card>
      <CardContent className="p-10 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Pill className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">No prescriptions yet</h3>
          <p className="text-sm text-muted-foreground">
            Create your first prescription to get started
          </p>
        </div>
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create your first prescription
        </Button>
      </CardContent>
    </Card>
  );
}

function PrescriptionRow({
  rx,
  selected,
  onView,
  onRePrescribe,
}: {
  rx: Prescription;
  selected: boolean;
  onView: () => void;
  onRePrescribe: () => void;
}) {
  const items = rx.items || [];
  const first = items[0];
  const extra = items.length > 1 ? `+ ${items.length - 1} more` : null;
  const patientName = rx.patient?.full_name || "Patient";
  const expiresAt = rx.expires_at ? new Date(rx.expires_at) : null;
  const statusClass = STATUS_COLORS[rx.status] || "bg-muted text-muted-foreground";

  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:bg-muted/40",
        selected && "border-primary",
      )}
      onClick={onView}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <Pill className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">
                {first?.medication_name || "Untitled"}
                {first?.dosage ? ` ${first.dosage}` : ""}
                {extra ? ` · ${extra}` : ""}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {patientName}
                {rx.prescription_number ? ` · ${rx.prescription_number}` : ""}
                {rx.prescribed_at
                  ? ` · ${format(new Date(rx.prescribed_at), "MMM d, yyyy")}`
                  : ""}
              </p>
            </div>
          </div>
          <Badge className={cn("text-[10px] uppercase", statusClass)}>
            {formatStatus(rx.status)}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {expiresAt && (
              <span>
                Expires {format(expiresAt, "MMM d")} · {rx.refills_remaining}/{rx.refills_total}{" "}
                refills
              </span>
            )}
            {rx.appointment_id && (
              <span title="From appointment" className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                From appointment
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={(e) => {
                e.stopPropagation();
                onRePrescribe();
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Re-prescribe
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MedicationHistoryPanel({
  items,
  onPick,
}: {
  items: { name: string; count: number; lastDate: string; lastItem: PrescriptionItem }[];
  onPick: (item: Partial<PrescriptionItem>) => void;
}) {
  const [open, setOpen] = useState(false);
  const visible = open ? items : items.slice(0, 5);

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Medication history
          </h4>
          {items.length > 5 && (
            <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
              {open ? "Collapse" : `Show all (${items.length})`}
            </Button>
          )}
        </div>
        <div className="divide-y">
          {visible.map((m) => (
            <button
              key={m.name}
              type="button"
              onClick={() =>
                onPick({
                  medication_name: m.lastItem.medication_name,
                  medication_code: m.lastItem.medication_code,
                  dosage: m.lastItem.dosage,
                  frequency: m.lastItem.frequency,
                  quantity: m.lastItem.quantity,
                  unit: m.lastItem.unit,
                  instructions: m.lastItem.instructions,
                  substitutions_allowed: m.lastItem.substitutions_allowed,
                })
              }
              className="w-full flex items-center justify-between py-2 text-left hover:bg-muted/40 -mx-3 px-3 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.count}× · last {format(new Date(m.lastDate), "MMM d, yyyy")}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Creator Panel (extends usePrescriptions.createPrescription with patient selector
// + "From previous" quick-fill strip).

function CreatorPanel({
  doctorId,
  patients,
  recentMedications,
  prefilledPatientId,
  prefilledItems,
  createPrescription,
  onCreated,
}: {
  doctorId: string;
  patients: any[];
  recentMedications: PrescriptionItem[];
  prefilledPatientId: string;
  prefilledItems: Partial<PrescriptionItem>[];
  createPrescription: ReturnType<typeof usePrescriptions>["createPrescription"];
  onCreated: (rxId: string) => void;
}) {
  const [patientId, setPatientId] = useState<string>(prefilledPatientId);
  const [items, setItems] = useState<Partial<PrescriptionItem>[]>(
    prefilledItems.length > 0 ? prefilledItems : [initialItem()],
  );
  const [refills, setRefills] = useState(0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  // React to pre-fill changes
  useEffect(() => {
    setPatientId(prefilledPatientId);
  }, [prefilledPatientId]);
  useEffect(() => {
    if (prefilledItems.length > 0) setItems(prefilledItems);
  }, [prefilledItems]);

  const selectedPatient = patients.find((p) => p.user_id === patientId);
  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => (p.full_name || "").toLowerCase().includes(q));
  }, [patients, search]);

  const updateItem = (index: number, field: keyof PrescriptionItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const addItem = () => setItems([...items, initialItem()]);
  const removeItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const appendFromRecent = (m: PrescriptionItem) => {
    setItems((prev) => [
      ...prev,
      {
        medication_name: m.medication_name,
        medication_code: m.medication_code,
        dosage: m.dosage,
        frequency: m.frequency,
        quantity: m.quantity,
        unit: m.unit,
        instructions: m.instructions,
        substitutions_allowed: m.substitutions_allowed,
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!patientId) {
      toast.error("Please select a patient");
      return;
    }
    const valid = items.filter(
      (i) => i.medication_name && i.dosage && i.frequency && i.quantity,
    );
    if (valid.length === 0) {
      toast.error("Please add at least one medication");
      return;
    }
    setSubmitting(true);
    try {
      const rxId = await createPrescription(
        patientId,
        doctorId,
        valid as PrescriptionItem[],
        refills,
        notes || undefined,
      );
      if (rxId) {
        try {
          await downloadPrescriptionPdf(rxId);
        } catch {
          /* non-critical */
        }
        onCreated(rxId);
        // reset
        setItems([initialItem()]);
        setRefills(0);
        setNotes("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Plus className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">New prescription</h3>
      </div>

      {/* Patient selector */}
      <div className="space-y-2">
        <Label>Patient *</Label>
        {selectedPatient ? (
          <div className="flex items-center justify-between rounded-md border p-2">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedPatient.avatar_url} />
                <AvatarFallback>
                  {(selectedPatient.full_name || "?").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{selectedPatient.full_name}</p>
                {selectedPatient.email && (
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedPatient.email}
                  </p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPatientId("")}>
              Change
            </Button>
          </div>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <UserIcon className="h-4 w-4 mr-2" />
                Select patient
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <div className="p-2 border-b">
                <Input
                  placeholder="Search patients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8"
                />
              </div>
              <ScrollArea className="max-h-64">
                {filteredPatients.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    No patients found
                  </div>
                ) : (
                  filteredPatients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPatientId(p.user_id);
                        setSearch("");
                      }}
                      className="w-full flex items-center gap-2 p-2 hover:bg-muted/40 text-left"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={p.avatar_url} />
                        <AvatarFallback>
                          {(p.full_name || "?").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm truncate">{p.full_name}</p>
                        {p.email && (
                          <p className="text-xs text-muted-foreground truncate">
                            {p.email}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* From previous */}
      {recentMedications.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">From previous</Label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recentMedications.map((m) => (
              <Button
                key={`${m.medication_name}-${m.dosage}`}
                size="sm"
                variant="outline"
                className="flex-shrink-0"
                onClick={() => appendFromRecent(m)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {m.medication_name}
                {m.dosage ? ` ${m.dosage}` : ""}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="border rounded-md p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Medication {idx + 1}</span>
              {items.length > 1 && (
                <Button size="sm" variant="ghost" onClick={() => removeItem(idx)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input
                  value={item.medication_name || ""}
                  onChange={(e) => updateItem(idx, "medication_name", e.target.value)}
                  placeholder="e.g., Amoxicillin"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Code</Label>
                <Input
                  value={item.medication_code || ""}
                  onChange={(e) => updateItem(idx, "medication_code", e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Dosage *</Label>
                <Input
                  value={item.dosage || ""}
                  onChange={(e) => updateItem(idx, "dosage", e.target.value)}
                  placeholder="500mg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Frequency *</Label>
                <Select
                  value={item.frequency || "once_daily"}
                  onValueChange={(v) => updateItem(idx, "frequency", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div className="space-y-1">
                  <Label className="text-xs">Qty *</Label>
                  <Input
                    type="number"
                    value={item.quantity ?? ""}
                    onChange={(e) =>
                      updateItem(idx, "quantity", parseInt(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unit</Label>
                  <Select
                    value={item.unit || "tablets"}
                    onValueChange={(v) => updateItem(idx, "unit", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Instructions</Label>
              <Input
                value={item.instructions || ""}
                onChange={(e) => updateItem(idx, "instructions", e.target.value)}
                placeholder="Take with food"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Allow substitutions</Label>
              <Switch
                checked={item.substitutions_allowed ?? true}
                onCheckedChange={(c) => updateItem(idx, "substitutions_allowed", c)}
              />
            </div>
          </div>
        ))}
        <Button variant="outline" onClick={addItem} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add another medication
        </Button>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t">
        <div className="space-y-1">
          <Label className="text-xs">Refills</Label>
          <Select value={refills.toString()} onValueChange={(v) => setRefills(parseInt(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3, 4, 5, 6, 11].map((n) => (
                <SelectItem key={n} value={n.toString()}>
                  {n} refill{n !== 1 ? "s" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes for the pharmacist..."
          rows={3}
        />
      </div>

      <div className="flex justify-end pt-3 border-t">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Creating..." : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Create prescription
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Detail Panel

function DetailPanel({
  rx,
  onClose,
  onRePrescribe,
  sendToPharmacy,
  refresh,
}: {
  rx: Prescription;
  onClose: () => void;
  onRePrescribe: () => void;
  sendToPharmacy: ReturnType<typeof usePrescriptions>["sendToPharmacy"];
  refresh: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [pharmacyId, setPharmacyId] = useState<string>("");
  const [showPharmacyPicker, setShowPharmacyPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!showPharmacyPicker) return;
    (async () => {
      const { data } = await supabase
        .from("pharmacies")
        .select("id, name, city")
        .order("name")
        .limit(50);
      setPharmacies(data || []);
    })();
  }, [showPharmacyPicker]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadPrescriptionPdf(rx.id, rx.prescription_number);
    } catch (e: any) {
      toast.error(e?.message || "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleSend = async () => {
    if (!pharmacyId) {
      toast.error("Please select a pharmacy");
      return;
    }
    setSending(true);
    try {
      await sendToPharmacy(rx.id, pharmacyId);
      setShowPharmacyPicker(false);
      refresh();
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("prescriptions")
        .update({ status: "cancelled" })
        .eq("id", rx.id);
      if (error) throw error;
      toast.success("Prescription cancelled");
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to cancel");
    } finally {
      setCancelling(false);
    }
  };

  const statusClass = STATUS_COLORS[rx.status] || "bg-muted text-muted-foreground";
  const expiresAt = rx.expires_at ? new Date(rx.expires_at) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{rx.prescription_number || "Prescription"}</h3>
            <Badge className={cn("text-[10px] uppercase", statusClass)}>
              {formatStatus(rx.status)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {rx.patient?.full_name || "Patient"} ·{" "}
            {rx.prescribed_at && format(new Date(rx.prescribed_at), "MMM d, yyyy")}
            {expiresAt && ` · Expires ${format(expiresAt, "MMM d, yyyy")}`}
            {` · ${rx.refills_remaining}/${rx.refills_total} refills`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {rx.appointment_id && (
        <Badge variant="outline" className="gap-1">
          <CalendarDays className="h-3 w-3" />
          Linked appointment
        </Badge>
      )}

      <div className="space-y-2">
        {(rx.items || []).map((it, i) => (
          <div key={i} className="border rounded-md p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">
                {it.medication_name} {it.dosage}
              </p>
              {it.substitutions_allowed && (
                <Badge variant="secondary" className="text-[10px]">
                  Substitutions OK
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {it.frequency?.replace(/_/g, " ")} · {it.quantity} {it.unit}
            </p>
            {it.instructions && (
              <p className="text-xs text-muted-foreground">{it.instructions}</p>
            )}
          </div>
        ))}
      </div>

      {rx.notes && (
        <div className="space-y-1">
          <Label className="text-xs">Notes</Label>
          <p className="text-sm text-muted-foreground">{rx.notes}</p>
        </div>
      )}

      {showPharmacyPicker && (
        <div className="space-y-2 border rounded-md p-3">
          <Label className="text-xs">Select pharmacy</Label>
          <Select value={pharmacyId} onValueChange={setPharmacyId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose pharmacy" />
            </SelectTrigger>
            <SelectContent>
              {pharmacies.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.city ? ` · ${p.city}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowPharmacyPicker(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={sending} onClick={handleSend}>
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-3 border-t">
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
          <Download className="h-4 w-4 mr-2" />
          {downloading ? "Downloading..." : "Download PDF"}
        </Button>
        {rx.status === "pending" && (
          <Button variant="outline" size="sm" onClick={() => setShowPharmacyPicker(true)}>
            <Send className="h-4 w-4 mr-2" />
            Send to pharmacy
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onRePrescribe}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Re-prescribe
        </Button>
        {rx.status === "pending" && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={cancelling}
            className="text-destructive"
          >
            <X className="h-4 w-4 mr-2" />
            {cancelling ? "Cancelling..." : "Cancel"}
          </Button>
        )}
      </div>
    </div>
  );
}
