// src/components/treatment/PlanSideSections.tsx
// Reusable in-app editors for Medications / Referrals / Tests on a treatment plan.
// All UI uses shadcn primitives — no browser popups.

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pill, ArrowRightLeft, FlaskConical } from "lucide-react";

export interface MedicationItem {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
}

export interface ReferralItem {
  specialty: string;
  referred_to?: string;
  reason?: string;
  urgency?: "routine" | "urgent";
  notes?: string;
}

export interface TestItem {
  test_name: string;
  test_type?: "lab" | "imaging" | "other";
  priority?: "routine" | "urgent" | "stat";
  clinical_notes?: string;
}

interface SectionShellProps {
  icon: React.ReactNode;
  title: string;
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  children: React.ReactNode;
}

const SectionShell = ({ icon, title, enabled, onEnabledChange, children }: SectionShellProps) => (
  <div className="space-y-3 rounded-lg border bg-card p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{enabled ? "On" : "Off"}</span>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>
    </div>
    {enabled && <div className="space-y-3">{children}</div>}
  </div>
);

/* ---------------- Medications ---------------- */

export const MedicationsSection = ({
  enabled,
  onEnabledChange,
  items,
  onChange,
}: {
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  items: MedicationItem[];
  onChange: (next: MedicationItem[]) => void;
}) => {
  const add = () => onChange([...items, { name: "" }]);
  const update = (idx: number, patch: Partial<MedicationItem>) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <SectionShell
      icon={<Pill className="h-4 w-4 text-primary" />}
      title="Medications"
      enabled={enabled}
      onEnabledChange={onEnabledChange}
    >
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No medications added.</p>
      ) : (
        items.map((m, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{`Medication ${i + 1}`}</Badge>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Name *</label>
                  <Input value={m.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="e.g. Amoxicillin" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Dosage</label>
                  <Input value={m.dosage || ""} onChange={(e) => update(i, { dosage: e.target.value })} placeholder="e.g. 500 mg" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Frequency</label>
                  <Input value={m.frequency || ""} onChange={(e) => update(i, { frequency: e.target.value })} placeholder="e.g. 3x/day" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Duration</label>
                  <Input value={m.duration || ""} onChange={(e) => update(i, { duration: e.target.value })} placeholder="e.g. 7 days" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Notes</label>
                <Textarea value={m.notes || ""} onChange={(e) => update(i, { notes: e.target.value })} placeholder="Additional instructions…" />
              </div>
            </CardContent>
          </Card>
        ))
      )}
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="mr-2 h-4 w-4" /> Add medication
      </Button>
    </SectionShell>
  );
};

/* ---------------- Referrals ---------------- */

export const ReferralsSection = ({
  enabled,
  onEnabledChange,
  items,
  onChange,
}: {
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  items: ReferralItem[];
  onChange: (next: ReferralItem[]) => void;
}) => {
  const add = () => onChange([...items, { specialty: "", urgency: "routine" }]);
  const update = (idx: number, patch: Partial<ReferralItem>) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <SectionShell
      icon={<ArrowRightLeft className="h-4 w-4 text-primary" />}
      title="Referrals"
      enabled={enabled}
      onEnabledChange={onEnabledChange}
    >
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No referrals added.</p>
      ) : (
        items.map((r, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{`Referral ${i + 1}`}</Badge>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Specialty *</label>
                  <Input value={r.specialty} onChange={(e) => update(i, { specialty: e.target.value })} placeholder="e.g. Endodontics" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Referred to (optional)</label>
                  <Input value={r.referred_to || ""} onChange={(e) => update(i, { referred_to: e.target.value })} placeholder="Doctor or clinic name" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Reason</label>
                  <Input value={r.reason || ""} onChange={(e) => update(i, { reason: e.target.value })} placeholder="Brief reason" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Urgency</label>
                  <Select value={r.urgency || "routine"} onValueChange={(v: any) => update(i, { urgency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Notes</label>
                <Textarea value={r.notes || ""} onChange={(e) => update(i, { notes: e.target.value })} placeholder="Additional context…" />
              </div>
            </CardContent>
          </Card>
        ))
      )}
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="mr-2 h-4 w-4" /> Add referral
      </Button>
    </SectionShell>
  );
};

/* ---------------- Tests ---------------- */

export const TestsSection = ({
  enabled,
  onEnabledChange,
  items,
  onChange,
}: {
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  items: TestItem[];
  onChange: (next: TestItem[]) => void;
}) => {
  const add = () => onChange([...items, { test_name: "", test_type: "lab", priority: "routine" }]);
  const update = (idx: number, patch: Partial<TestItem>) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <SectionShell
      icon={<FlaskConical className="h-4 w-4 text-primary" />}
      title="Tests / Lab orders"
      enabled={enabled}
      onEnabledChange={onEnabledChange}
    >
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No tests added.</p>
      ) : (
        items.map((t, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{`Test ${i + 1}`}</Badge>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Test name *</label>
                  <Input value={t.test_name} onChange={(e) => update(i, { test_name: e.target.value })} placeholder="e.g. CBC, Panoramic X-Ray" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Type</label>
                  <Select value={t.test_type || "lab"} onValueChange={(v: any) => update(i, { test_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lab">Lab</SelectItem>
                      <SelectItem value="imaging">Imaging</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Priority</label>
                  <Select value={t.priority || "routine"} onValueChange={(v: any) => update(i, { priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="stat">STAT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Clinical notes</label>
                <Textarea
                  value={t.clinical_notes || ""}
                  onChange={(e) => update(i, { clinical_notes: e.target.value })}
                  placeholder="Indication, special instructions…"
                />
              </div>
            </CardContent>
          </Card>
        ))
      )}
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="mr-2 h-4 w-4" /> Add test
      </Button>
    </SectionShell>
  );
};
