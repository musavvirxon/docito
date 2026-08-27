// File: src/components/financial/DoctorSettlementsPanel.tsx
//
// "Doctor Payments" — per-period settlement of commission owed to a doctor
// against the room rent that doctor owes the clinic.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Handshake, Plus, DoorOpen, Percent, Wallet, Check, X } from "lucide-react";

import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { FinanceEntityType } from "@/components/financial/FinanceHub";
import CompensationManager from "@/components/financial/CompensationManager";
import { useCompensationProfiles } from "@/hooks/useCompensationProfiles";
import { useDoctorRentProfiles, type DoctorRentProfileRow } from "@/hooks/useDoctorRentProfiles";
import { useDoctorPaymentSubmissions, type PaymentSubmissionRow } from "@/hooks/useDoctorPaymentSubmissions";
import { useCurrency } from "@/hooks/useCurrency";
import { fetchDoctorCollections, collectedInRange } from "@/lib/finance/doctorCollections";

type Props = {
  entityType: FinanceEntityType;
  entityId: string;
};

type DoctorRow = { id: string; user_id: string; name: string };
type RoomRow = { id: string; name: string | null; room_number: string | null };

type SettlementRecord = {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  commission_owed_cents: number;
  rent_owed_cents: number;
  net_cents: number;
  status: string;
};

type SettlementRow = {
  userId: string;
  doctorId: string | null;
  name: string;
  collectedCents: number;
  percentageRate: number | null;
  percentageOf: string | null;
  commissionCents: number;
  rentCents: number;
  roomLabel: string | null;
  netCents: number;
  settled: boolean;
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

function periodFromMonth(value: string) {
  const [y, m] = value.split("-").map((n) => Number(n));
  const start = new Date(y, (m || 1) - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m || 1, 0, 23, 59, 59, 999);
  return { start, end };
}

const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Rent normalised from its stored frequency to the selected period length. */
function rentForPeriod(amountCents: number, frequency: string, start: Date, end: Date) {
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  if (frequency === "daily") return Math.round(amountCents * days);
  if (frequency === "weekly") return Math.round((amountCents * days) / 7);
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  return Math.round((amountCents * days) / daysInMonth);
}

export default function DoctorSettlementsPanel({ entityType, entityId }: Props) {
  const { t } = useTranslation("dashboard");
  const { formatCents } = useCurrency();

  const [month, setMonth] = useState<string>(() => monthKey(new Date()));
  const { start: periodStart, end: periodEnd } = useMemo(() => periodFromMonth(month), [month]);

  const { rows: compProfiles, loading: compLoading } = useCompensationProfiles({ entityType, entityId });
  const { rows: rentProfiles, loading: rentLoading, refresh: refreshRent } = useDoctorRentProfiles({ entityType, entityId });

  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [records, setRecords] = useState<SettlementRecord[]>([]);
  const [collectedByUser, setCollectedByUser] = useState<Record<string, number>>({});
  const [computing, setComputing] = useState(false);
  const [savingUser, setSavingUser] = useState<string | null>(null);

  // ---- rent form -------------------------------------------------------
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DoctorRentProfileRow | null>(null);
  const [formUserId, setFormUserId] = useState("");
  const [formRoomId, setFormRoomId] = useState<string>("none");
  const [formAmount, setFormAmount] = useState("");
  const [formFrequency, setFormFrequency] = useState<"monthly" | "weekly" | "daily">("monthly");
  const [formEffectiveFrom, setFormEffectiveFrom] = useState(isoDate(new Date()));
  const [formActive, setFormActive] = useState(true);
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // ---- doctor-submitted payment log ------------------------------------
  const { rows: submissions, loading: subsLoading, review } = useDoctorPaymentSubmissions({
    mode: "entity",
    entityType,
    entityId,
  });
  const pendingSubmissions = useMemo(
    () => submissions.filter((s) => s.status === "pending"),
    [submissions],
  );
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PaymentSubmissionRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const doctorNameByUser = useMemo(() => {
    const m = new Map<string, string>();
    doctors.forEach((d) => m.set(d.user_id, d.name));
    return m;
  }, [doctors]);

  const doctorIdByUser = useMemo(() => {
    const m = new Map<string, string>();
    doctors.forEach((d) => m.set(d.user_id, d.id));
    return m;
  }, [doctors]);

  const roomLabel = useCallback(
    (roomId: string | null) => {
      if (!roomId) return null;
      const r = rooms.find((x) => x.id === roomId);
      if (!r) return null;
      return [r.name, r.room_number].filter(Boolean).join(" · ") || null;
    },
    [rooms],
  );

  // ---- load doctors + rooms -------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!entityId) return;
      const [{ data: docData }, { data: roomData }] = await Promise.all([
        supabase.from("doctors").select("id, user_id").eq("practice_id", entityId).limit(1000),
        supabase.from("clinic_rooms").select("id, name, room_number").eq("practice_id", entityId).limit(1000),
      ]);
      const docs = (docData || []) as Array<{ id: string; user_id: string }>;
      const userIds = docs.map((d) => d.user_id).filter(Boolean);
      let nameByUser = new Map<string, string>();
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        (profs || []).forEach((p: any) => nameByUser.set(p.id, p.full_name || ""));
      }
      if (cancelled) return;
      setDoctors(docs.map((d) => ({ id: d.id, user_id: d.user_id, name: nameByUser.get(d.user_id) || t("doctorSettlements.unknownDoctor") })));
      setRooms((roomData || []) as RoomRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [entityId, t]);

  // ---- load settlement records for the period --------------------------
  const loadRecords = useCallback(async () => {
    if (!entityId) return;
    const { data } = await supabase
      .from("doctor_settlement_records")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("period_start", isoDate(periodStart))
      .eq("period_end", isoDate(periodEnd));
    setRecords((data || []) as SettlementRecord[]);
  }, [entityType, entityId, periodStart, periodEnd]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  // ---- collections per doctor (major units -> cents) -------------------
  const relevantUserIds = useMemo(() => {
    const set = new Set<string>();
    compProfiles.filter((p) => p.is_active && p.compensation_type === "percentage").forEach((p) => set.add(p.user_id));
    rentProfiles.filter((p) => p.is_active).forEach((p) => set.add(p.user_id));
    return Array.from(set);
  }, [compProfiles, rentProfiles]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pctUsers = compProfiles
        .filter((p) => p.is_active && p.compensation_type === "percentage")
        .map((p) => p.user_id);
      if (!pctUsers.length) {
        setCollectedByUser({});
        return;
      }
      setComputing(true);
      try {
        const results: Record<string, number> = {};
        await Promise.all(
          Array.from(new Set(pctUsers)).map(async (userId) => {
            const doctorId = doctorIdByUser.get(userId);
            if (!doctorId) {
              results[userId] = 0;
              return;
            }
            try {
              const collections = await fetchDoctorCollections(doctorId);
              results[userId] = Math.round(collectedInRange(collections, periodStart, periodEnd) * 100);
            } catch {
              results[userId] = 0;
            }
          }),
        );
        if (!cancelled) setCollectedByUser(results);
      } finally {
        if (!cancelled) setComputing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [compProfiles, doctorIdByUser, periodStart, periodEnd]);

  // ---- build the settlement rows ---------------------------------------
  const settlementRows: SettlementRow[] = useMemo(() => {
    const periodEndIso = isoDate(periodEnd);
    return relevantUserIds
      .map((userId) => {
        const comp = compProfiles.find(
          (p) => p.user_id === userId && p.is_active && p.compensation_type === "percentage" && p.effective_from <= periodEndIso,
        );
        const rent = rentProfiles.find((p) => p.user_id === userId && p.is_active && p.effective_from <= periodEndIso);

        const collectedCents = collectedByUser[userId] ?? 0;
        const rate = comp?.percentage_rate ?? null;
        const commissionCents = rate ? Math.round((collectedCents * Number(rate)) / 100) : 0;
        const rentCents = rent ? rentForPeriod(Number(rent.rent_amount_cents || 0), rent.rent_frequency, periodStart, periodEnd) : 0;

        return {
          userId,
          doctorId: doctorIdByUser.get(userId) || null,
          name: doctorNameByUser.get(userId) || t("doctorSettlements.unknownDoctor"),
          collectedCents,
          percentageRate: rate,
          percentageOf: comp?.percentage_of ?? null,
          commissionCents,
          rentCents,
          roomLabel: rent ? roomLabel(rent.room_id) : null,
          netCents: commissionCents - rentCents,
          settled: records.some((r) => r.user_id === userId && r.status === "settled"),
        };
      })
      .filter((r) => r.commissionCents !== 0 || r.rentCents !== 0 || r.percentageRate != null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [relevantUserIds, compProfiles, rentProfiles, collectedByUser, doctorIdByUser, doctorNameByUser, records, periodStart, periodEnd, roomLabel, t]);

  const markSettled = async (row: SettlementRow) => {
    setSavingUser(row.userId);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const { error } = await supabase.from("doctor_settlement_records").upsert(
        {
          entity_type: entityType,
          entity_id: entityId,
          user_id: row.userId,
          period_start: isoDate(periodStart),
          period_end: isoDate(periodEnd),
          commission_owed_cents: row.commissionCents,
          rent_owed_cents: row.rentCents,
          net_cents: row.netCents,
          status: "settled",
          settled_at: new Date().toISOString(),
          settled_by: authData?.user?.id ?? null,
        },
        { onConflict: "entity_type,entity_id,user_id,period_start,period_end" },
      );
      if (error) throw error;
      toast.success(t("doctorSettlements.settledToast"));
      await loadRecords();
    } catch (e: any) {
      toast.error(e?.message || t("doctorSettlements.saveFailed"));
    } finally {
      setSavingUser(null);
    }
  };

  // ---- rent profile form ------------------------------------------------
  const openCreate = () => {
    setEditing(null);
    setFormUserId("");
    setFormRoomId("none");
    setFormAmount("");
    setFormFrequency("monthly");
    setFormEffectiveFrom(isoDate(new Date()));
    setFormActive(true);
    setFormNotes("");
    setFormOpen(true);
  };

  const openEdit = (row: DoctorRentProfileRow) => {
    setEditing(row);
    setFormUserId(row.user_id);
    setFormRoomId(row.room_id || "none");
    setFormAmount(((Number(row.rent_amount_cents) || 0) / 100).toString());
    setFormFrequency(row.rent_frequency);
    setFormEffectiveFrom(row.effective_from);
    setFormActive(row.is_active);
    setFormNotes(row.notes || "");
    setFormOpen(true);
  };

  const saveRentProfile = async () => {
    if (!formUserId) {
      toast.error(t("doctorSettlements.selectDoctorFirst"));
      return;
    }
    const amountCents = Math.round((Number(formAmount) || 0) * 100);
    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const payload = {
        entity_type: entityType,
        entity_id: entityId,
        user_id: formUserId,
        room_id: formRoomId === "none" ? null : formRoomId,
        rent_amount_cents: amountCents,
        rent_frequency: formFrequency,
        effective_from: formEffectiveFrom,
        is_active: formActive,
        notes: formNotes || null,
      };
      const { error } = editing
        ? await supabase.from("doctor_room_rent_profiles").update(payload).eq("id", editing.id)
        : await supabase.from("doctor_room_rent_profiles").insert({ ...payload, created_by: authData?.user?.id ?? null });
      if (error) throw error;
      toast.success(t("doctorSettlements.rentSaved"));
      setFormOpen(false);
      await refreshRent();
    } catch (e: any) {
      toast.error(e?.message || t("doctorSettlements.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const toggleRentActive = async (row: DoctorRentProfileRow) => {
    const { error } = await supabase
      .from("doctor_room_rent_profiles")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else await refreshRent();
  };

  const approveSubmission = async (row: PaymentSubmissionRow) => {
    setReviewingId(row.id);
    try {
      await review(row.id, "approved");
      toast.success(t("doctorSettlements.approvedToast"));
    } catch (e: any) {
      toast.error(e?.message || t("doctorSettlements.saveFailed"));
    } finally {
      setReviewingId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      toast.error(t("doctorSettlements.rejectReasonRequired"));
      return;
    }
    setReviewingId(rejectTarget.id);
    try {
      await review(rejectTarget.id, "rejected", rejectReason.trim());
      toast.success(t("doctorSettlements.rejectedToast"));
      setRejectTarget(null);
      setRejectReason("");
    } catch (e: any) {
      toast.error(e?.message || t("doctorSettlements.saveFailed"));
    } finally {
      setReviewingId(null);
    }
  };

  const submissionTypeLabel = (v: string) =>
    v === "rent_payment" ? t("doctorSettlements.typeRent") : t("doctorSettlements.typeCommission");

  const loading = compLoading || rentLoading || computing;

  return (
    <div className="space-y-6">
      {/* Pending approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-5 w-5" />
            {t("doctorSettlements.pendingApprovals")}
            {pendingSubmissions.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingSubmissions.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("doctorSettlements.loading")}</span>
            </div>
          ) : pendingSubmissions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t("doctorSettlements.noPendingApprovals")}
            </p>
          ) : (
            <div className="space-y-3">
              {pendingSubmissions.map((s) => (
                <div key={s.id} className="p-3 rounded-xl border border-border bg-muted/40 flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {doctorNameByUser.get(s.user_id) || t("doctorSettlements.unknownDoctor")}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-sm font-semibold">{formatCents(Number(s.amount_cents) || 0)}</span>
                      <Badge variant="outline" className="text-xs">{submissionTypeLabel(s.payment_type)}</Badge>
                      {s.period_start && (
                        <span className="text-xs text-muted-foreground">{s.period_start} — {s.period_end}</span>
                      )}
                    </div>
                    {s.note && <p className="text-xs text-muted-foreground mt-1">{s.note}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {t("doctorSettlements.submittedOn")}: {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" disabled={reviewingId === s.id} onClick={() => approveSubmission(s)}>
                      {reviewingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" />{t("doctorSettlements.approve")}</>}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reviewingId === s.id}
                      onClick={() => { setRejectTarget(s); setRejectReason(""); }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      {t("doctorSettlements.reject")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settlements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <Handshake className="h-5 w-5" />
            {t("doctorSettlements.title")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="settlement-month" className="text-xs text-muted-foreground">
              {t("doctorSettlements.period")}
            </Label>
            <Input
              id="settlement-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value || monthKey(new Date()))}
              className="w-[170px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("doctorSettlements.loading")}</span>
            </div>
          ) : settlementRows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Handshake className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("doctorSettlements.empty")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {settlementRows.map((row) => (
                <div key={row.userId} className="p-4 bg-muted/40 rounded-xl border border-border">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{row.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {row.percentageRate != null && (
                          <Badge variant="outline" className="text-xs">
                            <Percent className="h-3 w-3 mr-1" />
                            {row.percentageRate}% · {t("doctorSettlements.basis")}: {formatCents(row.collectedCents)}
                            {row.percentageOf ? ` (${row.percentageOf.replace(/_/g, " ")})` : ""}
                          </Badge>
                        )}
                        {row.rentCents > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <DoorOpen className="h-3 w-3 mr-1" />
                            {row.roomLabel || t("doctorSettlements.noRoom")} · {formatCents(row.rentCents)}
                          </Badge>
                        )}
                        {row.settled && <Badge variant="secondary" className="text-xs">{t("doctorSettlements.statusSettled")}</Badge>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${row.netCents >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                        {row.netCents >= 0
                          ? t("doctorSettlements.clinicOwes", { name: row.name, amount: formatCents(row.netCents) })
                          : t("doctorSettlements.doctorOwes", { name: row.name, amount: formatCents(Math.abs(row.netCents)) })}
                      </p>
                      <Button
                        size="sm"
                        variant={row.settled ? "secondary" : "default"}
                        className="mt-2"
                        disabled={savingUser === row.userId}
                        onClick={() => markSettled(row)}
                      >
                        {savingUser === row.userId ? <Loader2 className="h-4 w-4 animate-spin" /> : t("doctorSettlements.markSettled")}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3 text-xs text-muted-foreground">
                    <div>
                      <p>{t("doctorSettlements.commissionOwed")}</p>
                      <p className="font-medium text-foreground">{formatCents(row.commissionCents)}</p>
                    </div>
                    <div>
                      <p>{t("doctorSettlements.rentOwed")}</p>
                      <p className="font-medium text-foreground">{formatCents(row.rentCents)}</p>
                    </div>
                    <div>
                      <p>{t("doctorSettlements.net")}</p>
                      <p className="font-medium text-foreground">{formatCents(row.netCents)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rent profiles */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DoorOpen className="h-5 w-5" />
            {t("doctorSettlements.rentProfiles")}
          </CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            {t("doctorSettlements.addRent")}
          </Button>
        </CardHeader>
        <CardContent>
          {rentLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("doctorSettlements.loading")}</span>
            </div>
          ) : rentProfiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DoorOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("doctorSettlements.noRentProfiles")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rentProfiles.map((row) => (
                <div key={row.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openEdit(row)}>
                    <p className="font-medium truncate">{doctorNameByUser.get(row.user_id) || t("doctorSettlements.unknownDoctor")}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-sm font-medium">{formatCents(Number(row.rent_amount_cents) || 0)}</span>
                      <Badge variant="secondary" className="text-xs capitalize">{row.rent_frequency}</Badge>
                      {roomLabel(row.room_id) && (
                        <Badge variant="outline" className="text-xs">{roomLabel(row.room_id)}</Badge>
                      )}
                    </div>
                    {row.notes && <p className="text-xs text-muted-foreground mt-1">{row.notes}</p>}
                  </button>
                  <div className="flex items-center gap-2 ml-3">
                    <Switch checked={row.is_active} onCheckedChange={() => toggleRentActive(row)} />
                    <Badge variant={row.is_active ? "default" : "secondary"}>
                      {row.is_active ? t("doctorSettlements.active") : t("doctorSettlements.inactive")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission profiles (existing system) */}
      <CompensationManager entityType={entityType} entityId={entityId} />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t("doctorSettlements.editRent") : t("doctorSettlements.addRent")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("doctorSettlements.doctor")}</Label>
              <Select value={formUserId} onValueChange={setFormUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("doctorSettlements.selectDoctor")} />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.user_id} value={d.user_id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("doctorSettlements.room")}</Label>
              <Select value={formRoomId} onValueChange={setFormRoomId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("doctorSettlements.noRoom")}</SelectItem>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {[r.name, r.room_number].filter(Boolean).join(" · ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("doctorSettlements.rentAmount")}</Label>
                <Input type="number" min="0" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="500.00" />
              </div>
              <div>
                <Label>{t("doctorSettlements.frequency")}</Label>
                <Select value={formFrequency} onValueChange={(v) => setFormFrequency(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">{t("doctorSettlements.monthly")}</SelectItem>
                    <SelectItem value="weekly">{t("doctorSettlements.weekly")}</SelectItem>
                    <SelectItem value="daily">{t("doctorSettlements.daily")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{t("doctorSettlements.effectiveFrom")}</Label>
              <Input type="date" value={formEffectiveFrom} onChange={(e) => setFormEffectiveFrom(e.target.value)} />
            </div>

            <div>
              <Label>{t("doctorSettlements.notes")}</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={formActive} onCheckedChange={setFormActive} />
              <span className="text-sm">{t("doctorSettlements.active")}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>{t("doctorSettlements.cancel")}</Button>
            <Button onClick={saveRentProfile} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("doctorSettlements.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) setRejectTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("doctorSettlements.rejectSubmission")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="reject-reason">{t("doctorSettlements.rejectReason")}</Label>
            <Textarea id="reject-reason" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>{t("doctorSettlements.cancel")}</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={!!reviewingId}>
              {reviewingId ? <Loader2 className="h-4 w-4 animate-spin" /> : t("doctorSettlements.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
