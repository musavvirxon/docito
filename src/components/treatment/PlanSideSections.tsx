// src/components/treatment/PlanSideSections.tsx
// Reusable in-app editors for Medications / Referrals / Tests on a treatment plan.
// All UI uses shadcn primitives — no browser popups.

import { useTranslation } from "react-i18next";
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

const SectionShell = ({ icon, title, enabled, onEnabledChange, children }: SectionShellProps) => {
  const { t } = useTranslation("dashboard");
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {enabled
              ? t("doctor.planSections.toggle.on", "On")
              : t("doctor.planSections.toggle.off", "Off")}
          </span>
          <Switch checked={enabled} onCheckedChange={onEnabledChange} />
        </div>
      </div>
      {enabled && <div className="space-y-3">{children}</div>}
    </div>
  );
};

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
  const { t } = useTranslation("dashboard");
  const add = () => onChange([...items, { name: "" }]);
  const update = (idx: number, patch: Partial<MedicationItem>) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <SectionShell
      icon={<Pill className="h-4 w-4 text-primary" />}
      title={t("doctor.planSections.medications.title", "Medications")}
      enabled={enabled}
      onEnabledChange={onEnabledChange}
    >
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("doctor.planSections.medications.empty", "No medications added.")}
        </p>
      ) : (
        items.map((m, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline">
                  {t("doctor.planSections.medications.itemLabel", "Medication {{n}}", { n: i + 1 })}
                </Badge>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    {t("doctor.planSections.medications.name", "Name *")}
                  </label>
                  <Input
                    value={m.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    placeholder={t("doctor.planSections.medications.namePh", "e.g. Amoxicillin")}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    {t("doctor.planSections.medications.dosage", "Dosage")}
                  </label>
                  <Input
                    value={m.dosage || ""}
                    onChange={(e) => update(i, { dosage: e.target.value })}
                    placeholder={t("doctor.planSections.medications.dosagePh", "e.g. 500 mg")}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    {t("doctor.planSections.medications.frequency", "Frequency")}
                  </label>
                  <Input
                    value={m.frequency || ""}
                    onChange={(e) => update(i, { frequency: e.target.value })}
                    placeholder={t("doctor.planSections.medications.frequencyPh", "e.g. 3x/day")}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    {t("doctor.planSections.medications.duration", "Duration")}
                  </label>
                  <Input
                    value={m.duration || ""}
                    onChange={(e) => update(i, { duration: e.target.value })}
                    placeholder={t("doctor.planSections.medications.durationPh", "e.g. 7 days")}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">
                  {t("doctor.planSections.medications.notes", "Notes")}
                </label>
                <Textarea
                  value={m.notes || ""}
                  onChange={(e) => update(i, { notes: e.target.value })}
                  placeholder={t(
                    "doctor.planSections.medications.notesPh",
                    "Additional instructions…"
                  )}
                />
              </div>
            </CardContent>
          </Card>
        ))
      )}
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="mr-2 h-4 w-4" />{" "}
        {t("doctor.planSections.medications.add", "Add medication")}
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
  const { t } = useTranslation("dashboard");
  const add = () => onChange([...items, { specialty: "", urgency: "routine" }]);
  const update = (idx: number, patch: Partial<ReferralItem>) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <SectionShell
      icon={<ArrowRightLeft className="h-4 w-4 text-primary" />}
      title={t("doctor.planSections.referrals.title", "Referrals")}
      enabled={enabled}
      onEnabledChange={onEnabledChange}
    >
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("doctor.planSections.referrals.empty", "No referrals added.")}
        </p>
      ) : (
        items.map((r, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline">
                  {t("doctor.planSections.referrals.itemLabel", "Referral {{n}}", { n: i + 1 })}
                </Badge>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    {t("doctor.planSections.referrals.specialty", "Specialty *")}
                  </label>
                  <Input
                    value={r.specialty}
                    onChange={(e) => update(i, { specialty: e.target.value })}
                    placeholder={t(
                      "doctor.planSections.referrals.specialtyPh",
                      "e.g. Endodontics"
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    {t("doctor.planSections.referrals.referredTo", "Referred to (optional)")}
                  </label>
                  <Input
                    value={r.referred_to || ""}
                    onChange={(e) => update(i, { referred_to: e.target.value })}
                    placeholder={t(
                      "doctor.planSections.referrals.referredToPh",
                      "Doctor or clinic name"
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    {t("doctor.planSections.referrals.reason", "Reason")}
                  </label>
                  <Input
                    value={r.reason || ""}
                    onChange={(e) => update(i, { reason: e.target.value })}
                    placeholder={t("doctor.planSections.referrals.reasonPh", "Brief reason")}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    {t("doctor.planSections.referrals.urgency", "Urgency")}
                  </label>
                  <Select
                    value={r.urgency || "routine"}
                    onValueChange={(v: any) => update(i, { urgency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">
                        {t("doctor.planSections.referrals.routine", "Routine")}
                      </SelectItem>
                      <SelectItem value="urgent">
                        {t("doctor.planSections.referrals.urgent", "Urgent")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">
                  {t("doctor.planSections.referrals.notes", "Notes")}
                </label>
                <Textarea
                  value={r.notes || ""}
                  onChange={(e) => update(i, { notes: e.target.value })}
                  placeholder={t(
                    "doctor.planSections.referrals.notesPh",
                    "Additional context…"
                  )}
                />
              </div>
            </CardContent>
          </Card>
        ))
      )}
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="mr-2 h-4 w-4" />{" "}
        {t("doctor.planSections.referrals.add", "Add referral")}
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
  const { t } = useTranslation("dashboard");
  const add = () =>
    onChange([...items, { test_name: "", test_type: "lab", priority: "routine" }]);
  const update = (idx: number, patch: Partial<TestItem>) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <SectionShell
      icon={<FlaskConical className="h-4 w-4 text-primary" />}
      title={t("doctor.planSections.tests.title", "Tests / Lab orders")}
      enabled={enabled}
      onEnabledChange={onEnabledChange}
    >
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("doctor.planSections.tests.empty", "No tests added.")}
        </p>
      ) : (
        items.map((tt, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline">
                  {t("doctor.planSections.tests.itemLabel", "Test {{n}}", { n: i + 1 })}
                </Badge>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    {t("doctor.planSections.tests.name", "Test name *")}
                  </label>
                  <Input
                    value={tt.test_name}
                    onChange={(e) => update(i, { test_name: e.target.value })}
                    placeholder={t(
                      "doctor.planSections.tests.namePh",
                      "e.g. CBC, Panoramic X-Ray"
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    {t("doctor.planSections.tests.type", "Type")}
                  </label>
                  <Select
                    value={tt.test_type || "lab"}
                    onValueChange={(v: any) => update(i, { test_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lab">
                        {t("doctor.planSections.tests.typeLab", "Lab")}
                      </SelectItem>
                      <SelectItem value="imaging">
                        {t("doctor.planSections.tests.typeImaging", "Imaging")}
                      </SelectItem>
                      <SelectItem value="other">
                        {t("doctor.planSections.tests.typeOther", "Other")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    {t("doctor.planSections.tests.priority", "Priority")}
                  </label>
                  <Select
                    value={tt.priority || "routine"}
                    onValueChange={(v: any) => update(i, { priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">
                        {t("doctor.planSections.tests.routine", "Routine")}
                      </SelectItem>
                      <SelectItem value="urgent">
                        {t("doctor.planSections.tests.urgent", "Urgent")}
                      </SelectItem>
                      <SelectItem value="stat">
                        {t("doctor.planSections.tests.stat", "STAT")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">
                  {t("doctor.planSections.tests.clinicalNotes", "Clinical notes")}
                </label>
                <Textarea
                  value={tt.clinical_notes || ""}
                  onChange={(e) => update(i, { clinical_notes: e.target.value })}
                  placeholder={t(
                    "doctor.planSections.tests.clinicalNotesPh",
                    "Indication, special instructions…"
                  )}
                />
              </div>
            </CardContent>
          </Card>
        ))
      )}
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="mr-2 h-4 w-4" /> {t("doctor.planSections.tests.add", "Add test")}
      </Button>
    </SectionShell>
  );
};
