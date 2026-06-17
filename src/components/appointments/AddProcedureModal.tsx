import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToothSelector } from '@/components/dental/ToothSelector';
import { useDoctorServices } from '@/hooks/useDoctorServices';
import { useCurrency } from '@/hooks/useCurrency';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import type { AddProcedureInput, ProcedureStatus } from '@/hooks/useAppointmentProcedures';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isDentist: boolean;
  initialTeeth?: number[];
  onSubmit: (input: AddProcedureInput) => Promise<void> | void;
}

export function AddProcedureModal({ open, onOpenChange, isDentist, initialTeeth = [], onSubmit }: Props) {
  const { t } = useTranslation('appointments');
  const { services } = useDoctorServices();
  const { currency: viewerCurrency } = useCurrency();
  const [name, setName] = useState('');
  const [procedureId, setProcedureId] = useState<string | null>(null);
  const [cost, setCost] = useState<string>('');
  const [currency, setCurrency] = useState<string>(viewerCurrency || 'USD');
  const [status, setStatus] = useState<ProcedureStatus>('planned');
  const [notes, setNotes] = useState('');
  const [teeth, setTeeth] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTeeth(initialTeeth.map((n) => String(n)));
    } else {
      setName('');
      setProcedureId(null);
      setCost('');
      setStatus('planned');
      setNotes('');
      setTeeth([]);
    }
  }, [open, initialTeeth]);

  const serviceOptions = useMemo(() => services || [], [services]);

  const handlePickService = (id: string) => {
    if (id === '__custom') {
      setProcedureId(null);
      return;
    }
    const svc = serviceOptions.find((s) => s.id === id);
    if (svc) {
      setProcedureId(svc.id);
      setName(svc.name);
      if (svc.default_cost != null) setCost(String(svc.default_cost));
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        procedureId,
        status,
        cost: cost.trim() === '' ? null : Number(cost),
        notes: notes.trim() || null,
        toothNumbers: isDentist ? teeth.map((t) => Number(t)).filter(Number.isFinite) : [],
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('addProcedure.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {serviceOptions.length > 0 && (
            <div>
              <Label>{t('addProcedure.pickFromServices')}</Label>
              <Select onValueChange={handlePickService}>
                <SelectTrigger>
                  <SelectValue placeholder={t('addProcedure.chooseOrCustom')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__custom">{t('addProcedure.customProcedure')}</SelectItem>
                  {serviceOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.default_cost ? ` · $${s.default_cost}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label>{t('addProcedure.name')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('addProcedure.namePlaceholder')} />
            </div>
            <div>
              <Label>{t('addProcedure.cost')}</Label>
              <Input type="number" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>{t('addProcedure.status')}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProcedureStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">{t('addProcedure.statuses.planned')}</SelectItem>
                <SelectItem value="in_progress">{t('addProcedure.statuses.in_progress')}</SelectItem>
                <SelectItem value="completed">{t('addProcedure.statuses.completed')}</SelectItem>
                <SelectItem value="cancelled">{t('addProcedure.statuses.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isDentist && (
            <div>
              <Label>{t('addProcedure.teethLabel')}</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t('addProcedure.teethHint')}
              </p>
              <ToothSelector selectedTeeth={teeth} onChange={setTeeth} />
            </div>
          )}

          <div>
            <Label>{t('addProcedure.notes')}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('addProcedure.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !name.trim()}>
            {submitting ? t('addProcedure.adding') : t('addProcedure.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
