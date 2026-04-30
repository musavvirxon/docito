import { useState } from 'react';
import { Stethoscope, Loader2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToothSelector } from '@/components/dental/ToothSelector';
import { useDentalChart } from '@/hooks/useDentalChart';
import { TOOTH_STATUS_CONFIG, ToothStatus, PRIMARY_TEETH } from '@/components/dental/types';
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

/**
 * Lets a clinician select one or many teeth (FDI), assign a status,
 * and write a diagnosis. Saves to `tooth_records` (one row per tooth).
 */
export function ToothDiagnosisPicker({ patientId, onSaved }: Props) {
  const { upsertToothRecord, isVerifiedDentist } = useDentalChart(patientId);
  const [teeth, setTeeth] = useState<string[]>([]);
  const [status, setStatus] = useState<ToothStatus>('caries');
  const [diagnosis, setDiagnosis] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTeeth([]);
    setDiagnosis('');
    setStatus('caries');
  };

  const handleSubmit = async () => {
    if (teeth.length === 0) {
      toast.error('Select at least one tooth');
      return;
    }
    if (!diagnosis.trim()) {
      toast.error('Enter a diagnosis');
      return;
    }
    setSubmitting(true);
    try {
      const results = await Promise.all(
        teeth.map((t) => {
          const n = Number(t);
          const toothType = PRIMARY_SET.has(n) ? 'primary' : 'permanent';
          return upsertToothRecord(n, toothType, status, diagnosis.trim());
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
        </div>

        <div className="space-y-1.5">
          <Label>Diagnosis *</Label>
          <Textarea
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            rows={3}
            placeholder="e.g. Distal caries with pulpal involvement"
          />
        </div>

        <div className="flex items-center justify-between border-t pt-3 gap-3 flex-wrap">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{teeth.length}</span>{' '}
            {teeth.length === 1 ? 'tooth' : 'teeth'} selected
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting || teeth.length === 0 || !diagnosis.trim()}
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
