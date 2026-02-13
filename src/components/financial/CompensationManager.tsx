import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, DollarSign, Percent, Clock, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useCompensationProfiles, type CompensationProfileRow } from "@/hooks/useCompensationProfiles";

type FinanceEntityType = "clinic" | "practice" | "lab" | "imaging" | "pharmacy";

interface Props {
  entityType: FinanceEntityType;
  entityId: string;
}

type StaffMember = { user_id: string; full_name: string; role: string };

export default function CompensationManager({ entityType, entityId }: Props) {
  const { user } = useAuth();
  const { rows, loading, refresh } = useCompensationProfiles({ entityType, entityId });
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // Form state
  const [formUserId, setFormUserId] = useState("");
  const [formType, setFormType] = useState<"salary" | "hourly" | "percentage">("salary");
  const [formSalaryAmount, setFormSalaryAmount] = useState("");
  const [formSalaryPeriod, setFormSalaryPeriod] = useState<"monthly" | "weekly" | "daily">("monthly");
  const [formHourlyRate, setFormHourlyRate] = useState("");
  const [formPercentageRate, setFormPercentageRate] = useState("");
  const [formPercentageOf, setFormPercentageOf] = useState<"doctor_revenue" | "appointment_fee" | "procedure_fee">("doctor_revenue");
  const [formPayout, setFormPayout] = useState<"monthly" | "weekly" | "daily" | "each_time">("monthly");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Load staff for entity
  useEffect(() => {
    if (!entityId) return;
    (async () => {
      setStaffLoading(true);
      try {
        // Fetch from clinic_staff + doctors
        const [csRes, docRes] = await Promise.all([
          (supabase as any)
            .from("clinic_staff")
            .select("user_id, staff_role, status")
            .eq("practice_id", entityId)
            .eq("status", "active"),
          (supabase as any)
            .from("doctors")
            .select("user_id, specialty")
            .eq("practice_id", entityId),
        ]);

        const members: StaffMember[] = [];
        const seenIds = new Set<string>();

        for (const s of (csRes.data || []) as any[]) {
          if (!s.user_id || seenIds.has(s.user_id)) continue;
          seenIds.add(s.user_id);
          members.push({ user_id: s.user_id, full_name: "", role: s.staff_role || "staff" });
        }
        for (const d of (docRes.data || []) as any[]) {
          if (!d.user_id || seenIds.has(d.user_id)) continue;
          seenIds.add(d.user_id);
          members.push({ user_id: d.user_id, full_name: "", role: "doctor" });
        }

        // Hydrate names from profiles
        if (members.length > 0) {
          const ids = members.map((m) => m.user_id);
          const { data: profiles } = await (supabase as any)
            .from("profiles")
            .select("user_id, full_name, email")
            .in("user_id", ids);

          const nameMap = new Map<string, string>();
          for (const p of (profiles || []) as any[]) {
            nameMap.set(p.user_id, p.full_name || p.email || p.user_id.slice(0, 8));
          }
          for (const m of members) {
            m.full_name = nameMap.get(m.user_id) || m.user_id.slice(0, 8);
          }
        }

        setStaffList(members);
      } catch {
        setStaffList([]);
      } finally {
        setStaffLoading(false);
      }
    })();
  }, [entityId]);

  const resetForm = () => {
    setFormUserId("");
    setFormType("salary");
    setFormSalaryAmount("");
    setFormSalaryPeriod("monthly");
    setFormHourlyRate("");
    setFormPercentageRate("");
    setFormPercentageOf("doctor_revenue");
    setFormPayout("monthly");
    setFormNotes("");
  };

  const handleAdd = async () => {
    if (!formUserId) { toast.error("Select a staff member"); return; }
    setSaving(true);
    try {
      const insert: any = {
        entity_type: entityType,
        entity_id: entityId,
        user_id: formUserId,
        compensation_type: formType,
        payout_frequency: formPayout,
        effective_from: new Date().toISOString().slice(0, 10),
        is_active: true,
        notes: formNotes || null,
        created_by: user?.id || null,
      };

      if (formType === "salary") {
        insert.salary_amount_cents = Math.round(parseFloat(formSalaryAmount || "0") * 100);
        insert.salary_period = formSalaryPeriod;
      } else if (formType === "hourly") {
        insert.hourly_rate_cents = Math.round(parseFloat(formHourlyRate || "0") * 100);
      } else if (formType === "percentage") {
        insert.percentage_rate = parseFloat(formPercentageRate || "0");
        insert.percentage_of = formPercentageOf;
      }

      const { error } = await (supabase as any).from("staff_compensation_profiles").insert(insert);
      if (error) throw error;

      toast.success("Compensation profile created");
      resetForm();
      setAddOpen(false);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: CompensationProfileRow) => {
    try {
      const { error } = await (supabase as any)
        .from("staff_compensation_profiles")
        .update({ is_active: !row.is_active })
        .eq("id", row.id);
      if (error) throw error;
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update");
    }
  };

  const fmtCents = (cents: number | null) =>
    cents != null ? `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—";

  const getStaffName = (uid: string) => {
    const s = staffList.find((m) => m.user_id === uid);
    return s?.full_name || uid.slice(0, 8);
  };

  const getCompLabel = (row: CompensationProfileRow) => {
    if (row.compensation_type === "salary") {
      return `${fmtCents(row.salary_amount_cents)} / ${row.salary_period || "month"}`;
    }
    if (row.compensation_type === "hourly") {
      return `${fmtCents(row.hourly_rate_cents)} / hr`;
    }
    if (row.compensation_type === "percentage") {
      return `${row.percentage_rate ?? 0}% of ${(row.percentage_of || "revenue").replace(/_/g, " ")}`;
    }
    return "—";
  };

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Staff Compensation
          </span>
          <Button size="sm" onClick={() => { resetForm(); setAddOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Profile
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading || staffLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading…</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserPlus className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No compensation profiles yet. Add salary, hourly, or percentage-based pay for your staff.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{getStaffName(row.user_id)}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs capitalize">
                      {row.compensation_type === "percentage" ? (
                        <><Percent className="h-3 w-3 mr-1" /> Percentage</>
                      ) : row.compensation_type === "hourly" ? (
                        <><Clock className="h-3 w-3 mr-1" /> Hourly</>
                      ) : (
                        <><DollarSign className="h-3 w-3 mr-1" /> Salary</>
                      )}
                    </Badge>
                    <span className="text-sm font-medium">{getCompLabel(row)}</span>
                    <Badge variant="secondary" className="text-xs">
                      Payout: {row.payout_frequency.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  {row.notes && <p className="text-xs text-muted-foreground mt-1">{row.notes}</p>}
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <Switch checked={row.is_active} onCheckedChange={() => toggleActive(row)} />
                  <Badge variant={row.is_active ? "default" : "secondary"}>
                    {row.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Compensation Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Staff Member</Label>
              <Select value={formUserId} onValueChange={setFormUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member…" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s.user_id} value={s.user_id}>
                      {s.full_name} ({s.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Compensation Type</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">Fixed Salary</SelectItem>
                  <SelectItem value="hourly">Hourly Rate</SelectItem>
                  <SelectItem value="percentage">Percentage (commission)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formType === "salary" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Amount ($)</Label>
                  <Input type="number" min="0" step="0.01" value={formSalaryAmount} onChange={(e) => setFormSalaryAmount(e.target.value)} placeholder="3000.00" />
                </div>
                <div>
                  <Label>Period</Label>
                  <Select value={formSalaryPeriod} onValueChange={(v) => setFormSalaryPeriod(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {formType === "hourly" && (
              <div>
                <Label>Hourly Rate ($)</Label>
                <Input type="number" min="0" step="0.01" value={formHourlyRate} onChange={(e) => setFormHourlyRate(e.target.value)} placeholder="25.00" />
              </div>
            )}

            {formType === "percentage" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Percentage (%)</Label>
                  <Input type="number" min="0" max="100" step="0.01" value={formPercentageRate} onChange={(e) => setFormPercentageRate(e.target.value)} placeholder="15" />
                </div>
                <div>
                  <Label>% of</Label>
                  <Select value={formPercentageOf} onValueChange={(v) => setFormPercentageOf(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="doctor_revenue">Doctor Revenue</SelectItem>
                      <SelectItem value="appointment_fee">Appointment Fee</SelectItem>
                      <SelectItem value="procedure_fee">Procedure Fee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div>
              <Label>Payout Frequency</Label>
              <Select value={formPayout} onValueChange={(v) => setFormPayout(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="each_time">Each Appointment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="e.g. Cap at $5000/month" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
