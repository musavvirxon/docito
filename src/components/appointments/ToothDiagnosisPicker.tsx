import { useMemo, useState } from 'react';
import { Stethoscope, Loader2, Plus, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToothSelector } from '@/components/dental/ToothSelector';
import { useDentalChart } from '@/hooks/useDentalChart';
import { useDoctorData } from '@/contexts/DoctorDataContext';
import { PRIMARY_TEETH } from '@/components/dental/types';
import { PatientCurrentStateChart } from './PatientCurrentStateChart';
import { toast } from 'sonner';

interface Props {
  patientId: string;
  onSaved?: () => void;
}

const PRIMARY_SET = new Set<number>([
  ...PRIMARY_TEETH.upperRight,
  ...PRIMARY_TEETH.upperLeft,
  ...PRIMARY_TEETH.lowerLeft,
  ...PRIMARY_TEETH.lowerRight,
]);

const NEW_DIAGNOSIS_VALUE = '__new__';

/**
 * Lets a clinician select one or many teeth (FDI), assign a status,
 * and write a diagnosis. Diagnosis can be picked from the doctor's
 * diagnosis library or added as a new one (saved back to the library).
 * Saves to `tooth_records` (one row per tooth).
 */
export function ToothDiagnosisPicker({ patientId, onSaved }: Props) {
  const { upsertToothRecord, isVerifiedDentist } = useDentalChart(patientId);

  // Diagnosis library from the doctor's dashboard. Wrapped in try so the
  // component still renders if it's used outside a DoctorDataProvider.
  let libraryDiagnoses: any[] = [];
  let addLibraryDiagnosis: ((d: any) => Promise<{ success?: boolean; error?: string }>) | null = null;
  try {
    const ctx = useDoctorData();
    libraryDiagnoses = ctx.diagnoses || [];
    addLibraryDiagnosis = ctx.addDiagnosis;
  } catch {
    libraryDiagnoses = [];
  }

  const [teeth, setTeeth] = useState<string[]>([]);
  const [selectedDiagnosisId, setSelectedDiagnosisId] = useState<string>('');
  const [newDiagnosisTitle, setNewDiagnosisTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedDiagnosis = useMemo(
    () => libraryDiagnoses.find((d: any) => d.id === selectedDiagnosisId),
    [libraryDiagnoses, selectedDiagnosisId],
  );

  const isAddingNew = selectedDiagnosisId === NEW_DIAGNOSIS_VALUE;

  const reset = () => {
    setTeeth([]);
    setSelectedDiagnosisId('');
    setNewDiagnosisTitle('');
  };

  const resolveDiagnosisText = async (): Promise<string | null> => {
    if (isAddingNew) {
      const title = newDiagnosisTitle.trim();
      if (!title) {
        toast.error('Enter a diagnosis name');
        return null;
      }
      // Save to library so it's reusable
      if (addLibraryDiagnosis) {
        try {
          await addLibraryDiagnosis({ title, description: diagnosisNotes.trim() || null });
        } catch {
          // Non-fatal — still proceed with saving to tooth records
        }
      }
      return diagnosisNotes.trim() ? `${title} — ${diagnosisNotes.trim()}` : title;
    }
    if (selectedDiagnosis) {
      const base = selectedDiagnosis.title || '';
      return diagnosisNotes.trim() ? `${base} — ${diagnosisNotes.trim()}` : base;
    }
    toast.error('Choose a diagnosis or add a new one');
    return null;
  };

  const handleSubmit = async () => {
    if (teeth.length === 0) {
      toast.error('Select at least one tooth');
      return;
    }
    const diagnosisText = await resolveDiagnosisText();
    if (!diagnosisText) return;

    setSubmitting(true);
    try {
      const results = await Promise.all(
        teeth.map((t) => {
          const n = Number(t);
          const toothType = PRIMARY_SET.has(n) ? 'primary' : 'permanent';
          return upsertToothRecord(n, toothType, status, diagnosisText);
        }),
      );
      const ok = results.filter(Boolean).length;
      if (ok > 0) {
        toast.success(`Diagnosis saved for ${ok} ${ok === 1 ? 'tooth' : 'teeth'}`);
        reset();
        onSaved?.();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isVerifiedDentist) return null;

  const statusEntries = Object.entries(TOOTH_STATUS_CONFIG) as [
    ToothStatus,
    typeof TOOTH_STATUS_CONFIG[ToothStatus],
  ][];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Stethoscope className="h-4 w-4" /> Add Tooth Diagnosis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>
            Teeth (FDI){' '}
            <span className="text-xs text-muted-foreground font-normal">
              — select one or more teeth.
            </span>
          </Label>
          <ToothSelector selectedTeeth={teeth} onChange={setTeeth} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tooth status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ToothStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusEntries.map(([key, cfg]) => (
                  <SelectItem key={key} value={key} className="capitalize">
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Diagnosis *
            </Label>
            <Select
              value={selectedDiagnosisId}
              onValueChange={(v) => setSelectedDiagnosisId(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose from your library…" />
              </SelectTrigger>
              <SelectContent>
                {libraryDiagnoses.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Your diagnosis library is empty
                  </div>
                )}
                {libraryDiagnoses.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.title}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_DIAGNOSIS_VALUE}>
                  + Add new diagnosis…
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isAddingNew && (
          <div className="space-y-1.5">
            <Label>New diagnosis name *</Label>
            <Input
              value={newDiagnosisTitle}
              onChange={(e) => setNewDiagnosisTitle(e.target.value)}
              placeholder="e.g. Distal caries"
            />
            <p className="text-xs text-muted-foreground">
              This will be saved to your diagnosis library for future reuse.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Notes (optional)</Label>
          <Textarea
            value={diagnosisNotes}
            onChange={(e) => setDiagnosisNotes(e.target.value)}
            rows={2}
            placeholder="Additional notes for this tooth/teeth…"
          />
        </div>

        <div className="flex items-center justify-between border-t pt-3 gap-3 flex-wrap">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{teeth.length}</span>{' '}
            {teeth.length === 1 ? 'tooth' : 'teeth'} selected
          </div>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              teeth.length === 0 ||
              (!selectedDiagnosisId) ||
              (isAddingNew && !newDiagnosisTitle.trim())
            }
            className="gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save Diagnosis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ToothDiagnosisPicker;
