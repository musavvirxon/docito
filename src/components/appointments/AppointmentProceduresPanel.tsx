import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useCurrency } from '@/hooks/useCurrency';
import { getProcedureCategoryLabel } from '@/lib/procedureCategories';

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

const UNCATEGORIZED_KEY = '__uncategorized__';

export function AppointmentProceduresPanel({
  appointmentId,
  doctorId,
  patientId,
  doctorPatientId,
  isDentist,
  initialTeeth,
  onProceduresChanged,
}: Props) {
  const { t } = useTranslation('appointments');
  const [modalOpen, setModalOpen] = useState(false);
  const [seedTeeth, setSeedTeeth] = useState<number[]>(initialTeeth || []);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const { format: money } = useCurrency();

  const { items, loading, totalCost, refresh, addProcedure, updateStatus, removeProcedure } =
    useAppointmentProcedures({ appointmentId, doctorId, patientId, doctorPatientId });

  const grouped = useMemo(() => {
    const map = new Map<string, UnifiedProcedure[]>();
    for (const item of items) {
      const key = item.category || UNCATEGORIZED_KEY;
      const arr = map.get(key) || [];
      arr.push(item);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .map(([key, list]) => ({
        key,
        label:
          key === UNCATEGORIZED_KEY
            ? t('procedures.uncategorized', { defaultValue: 'Uncategorized' })
            : getProcedureCategoryLabel(key),
        items: list,
      }))
      .sort((a, b) => b.items.length - a.items.length || a.label.localeCompare(b.label));
  }, [items, t]);

  const visibleGroups =
    activeCategory === 'all' ? grouped : grouped.filter((g) => g.key === activeCategory);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" /> {t('procedures.title')}
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
              {t('procedures.refresh')}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSeedTeeth(initialTeeth || []);
                setModalOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> {t('procedures.addProcedure')}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {grouped.length > 1 && (
          <div className="sticky top-0 z-10 -mx-1 px-1 pb-2 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/70">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  activeCategory === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-foreground border-transparent hover:bg-muted'
                }`}
              >
                {t('procedures.allCategories', { defaultValue: 'All' })}{' '}
                <span className="opacity-70">({items.length})</span>
              </button>
              {grouped.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setActiveCategory(g.key)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${
                    activeCategory === g.key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-foreground border-transparent hover:bg-muted'
                  }`}
                >
                  {g.label} <span className="opacity-70">({g.items.length})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t('procedures.loading')}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('procedures.empty')}</p>
        ) : (
          <div className="space-y-4">
            {visibleGroups.map((group) => (
              <section key={group.key} className="space-y-2">
                {grouped.length > 1 && (
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      · {group.items.length}
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  {group.items.map((p) => (
                    <ProcedureRow
                      key={`${p.source}-${p.id}`}
                      item={p}
                      onStatus={(s) => updateStatus(p, s)}
                      onRemove={() => removeProcedure(p)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground">{t('procedures.total')}</span>
          <span className="text-sm font-semibold">
            {totalCost == null ? '—' : money(totalCost)}
          </span>
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
  const { t } = useTranslation('appointments');
  const { format: money } = useCurrency();
  const fmtMoney = (n: number | null, src?: string | null) =>
    n == null ? '—' : money(n, src || undefined);
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 rounded-lg bg-muted/40">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{item.name}</span>
          {item.code && (
            <Badge variant="secondary" className="text-[10px] font-mono">
              {item.code}
            </Badge>
          )}
          <Badge className={statusBadge(item.status)}>
            {t(`procedures.statuses.${item.status}`, {
              defaultValue: item.status.replace('_', ' '),
            })}
          </Badge>
          {item.toothNumbers.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {t('procedures.teethPrefix')}{' '}
              {item.toothNumbers
                .slice()
                .sort((a, b) => a - b)
                .join(', ')}
            </Badge>
          )}
          {item.source === 'general' && (
            <Badge variant="outline" className="text-[10px]">
              {t('procedures.generalBadge')}
            </Badge>
          )}
        </div>
        {item.notes && (
          <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-semibold tabular-nums">
          {fmtMoney(item.cost, item.currency)}
        </span>
        <Select value={item.status} onValueChange={(v) => onStatus(v as ProcedureStatus)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="planned">{t('procedures.statuses.planned')}</SelectItem>
            <SelectItem value="in_progress">{t('procedures.statuses.in_progress')}</SelectItem>
            <SelectItem value="completed">{t('procedures.statuses.completed')}</SelectItem>
            <SelectItem value="cancelled">{t('procedures.statuses.cancelled')}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onRemove}
          aria-label={t('procedures.remove')}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
