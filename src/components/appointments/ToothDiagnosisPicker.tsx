import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useDiagnosisLibrary } from '@/hooks/useDiagnosisLibrary';
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

export function ToothDiagnosisPicker({ patientId, onSaved }: Props) {
  const { t } = useTranslation('appointments');
  const { upsertToothRecord, isVerifiedDentist } = useDentalChart(patientId);

  const {
    diagnoses: libraryDiagnoses,
    loading: libraryLoading,
    addDiagnosis: addLibraryDiagnosis,
  } = useDiagnosisLibrary();


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
        toast.error(t('toothDiagnosis.errors.enterName'));
        return null;
      }
      if (addLibraryDiagnosis) {
        try {
          await addLibraryDiagnosis({ title, description: null });
        } catch {
          // Non-fatal
        }
      }
      return title;
    }
    if (selectedDiagnosis) {
      return selectedDiagnosis.title || '';
    }
    toast.error(t('toothDiagnosis.errors.chooseOrAdd'));
    return null;
  };

  const handleSubmit = async () => {
    if (teeth.length === 0) {
      toast.error(t('toothDiagnosis.errors.selectTooth'));
      return;
    }
    const diagnosisText = await resolveDiagnosisText();
    if (!diagnosisText) return;

    setSubmitting(true);
    try {
      const results = await Promise.all(
        teeth.map((tNum) => {
          const n = Number(tNum);
          const toothType = PRIMARY_SET.has(n) ? 'primary' : 'permanent';
          return upsertToothRecord(n, toothType, 'caries', diagnosisText);
        }),
      );
      const ok = results.filter(Boolean).length;
      if (ok > 0) {
        toast.success(t('toothDiagnosis.savedFor', { count: ok }));
        reset();
        onSaved?.();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isVerifiedDentist) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Stethoscope className="h-4 w-4" /> {t('toothDiagnosis.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>
            {t('toothDiagnosis.teethLabel')}{' '}
            <span className="text-xs text-muted-foreground font-normal">
              {t('toothDiagnosis.teethHint')}
            </span>
          </Label>
          <ToothSelector selectedTeeth={teeth} onChange={setTeeth} />
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> {t('toothDiagnosis.diagnosis')}
          </Label>
          <Select
            value={selectedDiagnosisId}
            onValueChange={(v) => setSelectedDiagnosisId(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('toothDiagnosis.chooseFromLibrary')} />
            </SelectTrigger>
            <SelectContent>
              {libraryLoading && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  {t('toothDiagnosis.libraryLoading', 'Loading your diagnoses…')}
                </div>
              )}
              {!libraryLoading && libraryDiagnoses.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  {t('toothDiagnosis.libraryEmpty')}
                </div>
              )}

              {libraryDiagnoses.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.title}
                </SelectItem>
              ))}
              <SelectItem value={NEW_DIAGNOSIS_VALUE}>
                {t('toothDiagnosis.addNew')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isAddingNew && (
          <div className="space-y-1.5">
            <Label>{t('toothDiagnosis.newDiagnosisName')}</Label>
            <Input
              value={newDiagnosisTitle}
              onChange={(e) => setNewDiagnosisTitle(e.target.value)}
              placeholder={t('toothDiagnosis.newDiagnosisPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">
              {t('toothDiagnosis.newDiagnosisHint')}
            </p>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={
            submitting ||
            teeth.length === 0 ||
            (!selectedDiagnosisId) ||
            (isAddingNew && !newDiagnosisTitle.trim())
          }
          className="gap-2 w-full"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t('toothDiagnosis.save')}
        </Button>

        <PatientCurrentStateChart patientId={patientId} />

        <div className="flex items-center justify-between border-t pt-3 gap-3 flex-wrap">
          <div className="text-sm text-muted-foreground">
            {t('toothDiagnosis.selected', { count: teeth.length })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ToothDiagnosisPicker;
