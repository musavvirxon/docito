import { useEffect, useMemo, useState } from 'react';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToothSelector } from '@/components/dental/ToothSelector';
import { useDoctorServices } from '@/hooks/useDoctorServices';
import type { AddProcedureInput, UnifiedProcedure } from '@/hooks/useAppointmentProcedures';

interface Props {
  initialTeeth?: number[];
  onSubmit: (input: AddProcedureInput) => Promise<void> | void;
  procedures?: UnifiedProcedure[];
  onRemove?: (item: UnifiedProcedure) => Promise<void> | void;
}

/**
 * Inline (big) procedure adder for the Dental tab.
 * Total cost = unit cost × max(selected teeth, 1).
 * Saving creates a `tooth_procedure_history` row and an auto-billed
 * `billing_transactions` charge (handled inside `useAppointmentProcedures.addProcedure`).
 */
export function DentalProcedurePicker({ initialTeeth = [], onSubmit, procedures = [], onRemove }: Props) {
  const { services, loading: loadingServices } = useDoctorServices();
  const [name, setName] = useState('');
  const [procedureId, setProcedureId] = useState<string | null>(null);
  const [unitCost, setUnitCost] = useState<string>('');
  const [teeth, setTeeth] = useState<string[]>(initialTeeth.map(String));
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Sync incoming chart selection
  useEffect(() => {
    setTeeth(initialTeeth.map(String));
  }, [initialTeeth.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const serviceOptions = useMemo(() => services || [], [services]);
  const unit = unitCost.trim() === '' ? 0 : Number(unitCost) || 0;
  const total = unit * Math.max(teeth.length, 1);

  const handlePickService = (id: string) => {
    if (id === '__custom') {
      setProcedureId(null);
      return;
    }
    const svc = serviceOptions.find((s) => s.id === id);
    if (svc) {
      setProcedureId(svc.id);
      setName(svc.name);
      const cost =
        (svc as any).default_cost ??
        (svc as any).price ??
        null;
      if (cost != null) setUnitCost(String(cost));
    }
  };

  const reset = () => {
    setName('');
    setProcedureId(null);
    setUnitCost('');
    setTeeth([]);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        procedureId,
        status: 'completed',
        cost: unit > 0 ? unit : null,
        notes: null,
        toothNumbers: teeth.map((t) => Number(t)).filter(Number.isFinite),
      });
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Dental Procedure
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {serviceOptions.length > 0 && (
          <div className="space-y-1.5">
            <Label>Pick from your services</Label>
            <Select onValueChange={handlePickService} disabled={loadingServices}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a service or enter a custom one" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__custom">— Custom procedure —</SelectItem>
                {serviceOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {(s as any).default_cost ? ` · $${(s as any).default_cost}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 space-y-1.5">
            <Label>Procedure name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Composite filling"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Unit cost</Label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>
            Teeth (FDI){' '}
            <span className="text-xs text-muted-foreground font-normal">
              — select one or more. Cost is multiplied by the number of teeth.
            </span>
          </Label>
          <ToothSelector selectedTeeth={teeth} onChange={setTeeth} />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center justify-between">
            <span>Added Procedures</span>
            <span className="text-xs text-muted-foreground font-normal">
              {procedures.length} item{procedures.length === 1 ? '' : 's'} · Total{' '}
              <span className="font-semibold text-foreground">
                {fmtMoney(procedures.reduce((s, p) => s + (p.cost || 0), 0))}
              </span>
            </span>
          </Label>
          {procedures.length === 0 ? (
            <p className="text-xs text-muted-foreground border rounded-md p-3">
              No procedures added yet for this appointment.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {procedures.map((p) => (
                <div
                  key={`${p.source}-${p.id}`}
                  className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{p.name}</span>
                      {p.toothNumbers.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          Teeth: {p.toothNumbers.slice().sort((a, b) => a - b).join(', ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums shrink-0">
                    {fmtMoney(p.cost || 0)}
                  </span>
                  {onRemove && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      disabled={removingId === p.id}
                      onClick={async () => {
                        setRemovingId(p.id);
                        try {
                          await onRemove(p);
                        } finally {
                          setRemovingId(null);
                        }
                      }}
                      aria-label="Remove procedure"
                    >
                      {removingId === p.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-3 gap-3 flex-wrap">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{Math.max(teeth.length, 1)}</span>{' '}
            {teeth.length === 1 ? 'tooth' : 'teeth'} ×{' '}
            <span className="font-medium text-foreground">{fmtMoney(unit)}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <span className="text-muted-foreground mr-1">Total:</span>
              <span className="font-semibold tabular-nums">{fmtMoney(total)}</span>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !name.trim()}
              className="gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save Procedure
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DentalProcedurePicker;
