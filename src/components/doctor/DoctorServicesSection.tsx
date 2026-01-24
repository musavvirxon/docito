// src/components/doctor/DoctorServicesSection.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Stethoscope } from "lucide-react";
import { useDoctorData } from "@/contexts/DoctorDataContext";
import { useTranslation } from "react-i18next";

interface DoctorServicesSectionProps {
  /** Legacy prop: kept so DoctorDashboard doesn't break. */
  readOnly?: boolean;
  /** Legacy prop: kept so DoctorDashboard doesn't break. */
  assignedServices?: string[];
}

export interface DiagnosisTemplateFormData {
  title: string;
  icd10_code: string;
  description: string;
  tags: string[];
  is_active: boolean;
}

const DoctorServicesSection = ({ readOnly = false, assignedServices }: DoctorServicesSectionProps) => {
  const { t } = useTranslation("dashboard");
  const {
    diagnoses,
    diagnosisLoading,
    addDiagnosis,
    updateDiagnosis,
    deleteDiagnosis,
  } = useDoctorData() as any;

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = (diagnoses || []) as any[];
    if (!q) return items;
    return items.filter((d) => {
      const hay = [d.title, d.icd10_code, d.description, ...(d.tags || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [diagnoses, query]);

  const formatTags = (raw: string) =>
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);

  const DiagnosisForm = ({
    diagnosisId,
    onSave,
    onCancel,
  }: {
    diagnosisId?: string;
    onSave: (data: DiagnosisTemplateFormData) => void;
    onCancel: () => void;
  }) => {
    const existing = diagnosisId ? (diagnoses || []).find((d: any) => d.id === diagnosisId) : null;

    const [title, setTitle] = useState(existing?.title || "");
    const [icd10, setIcd10] = useState(existing?.icd10_code || "");
    const [description, setDescription] = useState(existing?.description || "");
    const [tagsRaw, setTagsRaw] = useState((existing?.tags || []).join(", "));
    const [isActive, setIsActive] = useState(existing?.is_active ?? true);

    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave({
        title: title.trim(),
        icd10_code: icd10.trim(),
        description: description.trim(),
        tags: formatTags(tagsRaw),
        is_active: isActive,
      });
    };

    return (
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="dxTitle">{t("doctor.diagnoses.titleLabel", "Diagnosis")}</Label>
          <Input
            id="dxTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("doctor.diagnoses.titlePlaceholder", "e.g. Hypertension")}
            required
          />
        </div>

        <div>
          <Label htmlFor="dxCode">{t("doctor.diagnoses.codeLabel", "ICD-10 Code (optional)")}</Label>
          <Input
            id="dxCode"
            value={icd10}
            onChange={(e) => setIcd10(e.target.value)}
            placeholder={t("doctor.diagnoses.codePlaceholder", "e.g. I10")}
          />
        </div>

        <div>
          <Label htmlFor="dxDesc">{t("doctor.diagnoses.descriptionLabel", "Notes / Description")}</Label>
          <Textarea
            id="dxDesc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("doctor.diagnoses.descriptionPlaceholder", "Typical findings, workup, plan...")}
            className="min-h-[100px]"
          />
        </div>

        <div>
          <Label htmlFor="dxTags">{t("doctor.diagnoses.tagsLabel", "Tags (comma-separated)")}</Label>
          <Input
            id="dxTags"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder={t("doctor.diagnoses.tagsPlaceholder", "e.g. cardiology, chronic")}
          />
        </div>

        <div className="flex items-center justify-between border rounded-lg p-3">
          <div>
            <p className="font-medium">{t("doctor.diagnoses.activeLabel", "Active")}</p>
            <p className="text-sm text-muted-foreground">
              {t("doctor.diagnoses.activeHelp", "Inactive diagnoses stay in your library but won't be suggested.")}
            </p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("doctor.diagnoses.cancel", "Cancel")}
          </Button>
          <Button type="submit">
            {diagnosisId ? t("doctor.diagnoses.update", "Update") : t("doctor.diagnoses.add", "Add")}
          </Button>
        </div>
      </form>
    );
  };

  const onAdd = async (data: DiagnosisTemplateFormData) => {
    const res = await addDiagnosis?.(data);
    if (res?.success) setIsAdding(false);
  };

  const onUpdate = async (data: DiagnosisTemplateFormData) => {
    if (!editingId) return;
    const res = await updateDiagnosis?.(editingId, data);
    if (res?.success) setEditingId(null);
  };

  const onDelete = async (id: string) => {
    if (readOnly) return;
    if (!confirm(t("doctor.diagnoses.confirmDelete", "Delete this diagnosis from your library?") as any)) return;
    await deleteDiagnosis?.(id);
  };

  const onToggle = async (id: string, next: boolean) => {
    if (readOnly) return;
    await updateDiagnosis?.(id, { is_active: next });
  };

  // Legacy readOnly mode: show whatever the clinic assigned as a list.
  if (readOnly) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("doctor.diagnoses.assignedTitle", "Assigned Diagnoses")}</CardTitle>
            <p className="text-muted-foreground">
              {t("doctor.diagnoses.assignedDesc", "Diagnoses provided by your clinic.")}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(assignedServices || []).length > 0 ? (
                assignedServices!.map((name, idx) => (
                  <div key={idx} className="p-4 border rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium">{name}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("doctor.diagnoses.assignedByClinic", "Assigned by clinic")}
                      </p>
                    </div>
                    <Badge variant="secondary">{t("doctor.diagnoses.assigned", "Assigned")}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">{t("doctor.diagnoses.noneAssigned", "No assigned diagnoses")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                {t("doctor.diagnoses.libraryTitle", "Diagnosis Library")}
              </CardTitle>
              <p className="text-muted-foreground">
                {t(
                  "doctor.diagnoses.libraryDesc",
                  "Create reusable diagnoses you can quickly apply during appointments."
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("doctor.diagnoses.search", "Search diagnoses...")}
                className="w-full md:w-64"
              />
              <Dialog open={isAdding} onOpenChange={setIsAdding}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("doctor.diagnoses.new", "New")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{t("doctor.diagnoses.addTitle", "Add Diagnosis")}</DialogTitle>
                  </DialogHeader>
                  <DiagnosisForm onSave={onAdd} onCancel={() => setIsAdding(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {diagnosisLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="text-center py-10">
                  <Stethoscope className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {t("doctor.diagnoses.empty", "No diagnoses yet.")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("doctor.diagnoses.emptyHelp", "Add your first diagnosis to reuse it in appointments.")}
                  </p>
                </div>
              ) : (
                filtered.map((d: any) => (
                  <div key={d.id} className="p-4 border rounded-lg">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{d.title}</h3>
                          {d.icd10_code ? <Badge variant="outline">{d.icd10_code}</Badge> : null}
                          {!d.is_active ? <Badge variant="secondary">{t("doctor.diagnoses.inactive", "Inactive")}</Badge> : null}
                        </div>
                        {d.description ? <p className="text-sm text-muted-foreground">{d.description}</p> : null}
                        {(d.tags || []).length > 0 ? (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {(d.tags || []).slice(0, 8).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex items-center gap-2 mr-2">
                          <span className="text-sm text-muted-foreground">{t("doctor.diagnoses.activeShort", "Active")}</span>
                          <Switch checked={!!d.is_active} onCheckedChange={(v) => onToggle(d.id, v)} />
                        </div>
                        <Dialog open={editingId === d.id} onOpenChange={(open) => setEditingId(open ? d.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{t("doctor.diagnoses.editTitle", "Edit Diagnosis")}</DialogTitle>
                            </DialogHeader>
                            <DiagnosisForm
                              diagnosisId={d.id}
                              onSave={onUpdate}
                              onCancel={() => setEditingId(null)}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button variant="outline" size="sm" onClick={() => onDelete(d.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorServicesSection;
