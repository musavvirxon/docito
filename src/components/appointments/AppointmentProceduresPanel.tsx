import { useState } from 'react';
import { Plus, Trash2, Stethoscope, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AddProcedureModal } from './AddProcedureModal';
import {
  useAppointmentProcedures,
  type ProcedureStatus,
  type UnifiedProcedure,
} from '@/hooks/useAppointmentProcedures';

interface Props {
  appointmentId: string;
  doctorId: string;
  patientId?: string | null;
  doctorPatientId?: string | null;
  isDentist: boolean;
  initialTeeth?: number[];
  onProceduresChanged?: () => void | Promise<void>;
}

const statusBadge = (s: ProcedureStatus) => {
  switch (s) {
    case 'completed':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
    case 'in_progress':
      return 'bg-blue-500/15 text-blue-700 dark:text-blue-300';
    case 'cancelled':
      return 'bg-red-500/15 text-red-700 dark:text-red-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const fmtMoney = (n: number | null) => {
  if (n == null) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
};

export function AppointmentProceduresPanel({
  appointmentId,
  doctorId,
  patientId,
  doctorPatientId,
  isDentist,
  initialTeeth,
  onProceduresChanged,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [seedTeeth, setSeedTeeth] = useState<number[]>(initialTeeth || []);

  const { items, loading, totalCost, refresh, addProcedure, updateStatus, removeProcedure } =
    useAppointmentProcedures({ appointmentId, doctorId, patientId, doctorPatientId });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" /> Procedures
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSeedTeeth(initialTeeth || []);
                setModalOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Add Procedure
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading && items.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No procedures recorded for this appointment yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((p) => (
              <ProcedureRow
                key={`${p.source}-${p.id}`}
                item={p}
                onStatus={(s) => updateStatus(p, s)}
                onRemove={() => removeProcedure(p)}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-sm font-semibold">{fmtMoney(totalCost)}</span>
        </div>
      </CardContent>

      <AddProcedureModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        isDentist={isDentist}
        initialTeeth={seedTeeth}
        onSubmit={async (input) => {
          await addProcedure(input);
          await onProceduresChanged?.();
        }}
      />
    </Card>
  );
}

function ProcedureRow({
  item,
  onStatus,
  onRemove,
}: {
  item: UnifiedProcedure;
  onStatus: (s: ProcedureStatus) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 rounded-lg bg-muted/40">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{item.name}</span>
          <Badge className={statusBadge(item.status)}>{item.status.replace('_', ' ')}</Badge>
          {item.toothNumbers.length > 0 && (
            <Badge variant="outline" className="text-xs">
              Teeth: {item.toothNumbers.slice().sort((a, b) => a - b).join(', ')}
            </Badge>
          )}
          {item.source === 'general' && (
            <Badge variant="outline" className="text-[10px]">General</Badge>
          )}
        </div>
        {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-semibold tabular-nums">{fmtMoney(item.cost)}</span>
        <Select value={item.status} onValueChange={(v) => onStatus(v as ProcedureStatus)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove} aria-label="Remove">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
