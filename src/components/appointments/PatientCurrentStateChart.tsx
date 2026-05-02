import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ToothSVG } from '@/components/dental/ToothSVG';
import { DentalChartLegend } from '@/components/dental/DentalChartLegend';
import {
  PERMANENT_TEETH,
  TOOTH_STATUS_CONFIG,
  type ToothStatus,
  type ToothType,
} from '@/components/dental/types';
import { useDentalChart } from '@/hooks/useDentalChart';
import { Activity, Loader2 } from 'lucide-react';

interface Props {
  patientId: string;
}

/**
 * Read-only "current state" dental chart.
 *
 * Aggregates `tooth_records` (status + diagnoses written in `notes`) and
 * `tooth_procedure_history` (procedures from this and previous appointments,
 * across ALL doctors) for a patient. Per-tooth tooltip surfaces the full
 * clinical history so a clinician can quickly see what's been done.
 */
export function PatientCurrentStateChart({ patientId }: Props) {
  const { toothRecords, procedureHistory, loading } = useDentalChart(patientId);

  const byTooth = useMemo(() => {
    const map = new Map<
      number,
      { status: ToothStatus; diagnosis?: string | null; procedures: { name: string; status: string; date?: string | null }[] }
    >();

    for (const r of toothRecords) {
      map.set(r.tooth_number, {
        status: (r.status as ToothStatus) || 'healthy',
        diagnosis: r.notes,
        procedures: [],
      });
    }

    for (const p of procedureHistory) {
      for (const num of p.tooth_numbers || []) {
        const existing = map.get(num) || { status: 'healthy' as ToothStatus, procedures: [] };
        existing.procedures.push({
          name: p.procedure_name,
          status: p.status,
          date: p.performed_at || p.created_at,
        });
        map.set(num, existing);
      }
    }

    return map;
  }, [toothRecords, procedureHistory]);

  const renderQuadrant = (teeth: number[], type: ToothType, label: string) => (
    <div className="space-y-1">
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      <div className="flex gap-0.5">
        {teeth.map((num) => {
          const entry = byTooth.get(num);
          const status = entry?.status || 'healthy';
          const hasProcedure = (entry?.procedures.length || 0) > 0;
          return (
            <TooltipProvider key={num}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ToothSVG
                      number={num}
                      toothType={type}
                      status={status}
                      isSelected={false}
                      isEditable={false}
                      onClick={() => {}}
                      hasProcedure={hasProcedure}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px]">
                  <div className="space-y-1.5">
                    <p className="font-semibold text-xs">Tooth {num}</p>
                    <p className="text-[11px] flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: TOOTH_STATUS_CONFIG[status].color }}
                      />
                      {TOOTH_STATUS_CONFIG[status].label}
                    </p>
                    {entry?.diagnosis && (
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">Dx:</span> {entry.diagnosis}
                      </p>
                    )}
                    {entry?.procedures.length ? (
                      <div className="text-[11px] space-y-0.5 border-t pt-1">
                        <span className="font-medium text-foreground">History:</span>
                        {entry.procedures.slice(0, 5).map((p, i) => (
                          <div key={i} className="flex justify-between gap-2">
                            <span>{p.name}</span>
                            <span className="text-muted-foreground capitalize">{p.status}</span>
                          </div>
                        ))}
                        {entry.procedures.length > 5 && (
                          <span className="text-muted-foreground">
                            +{entry.procedures.length - 5} more
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4" /> Current Dental State
          <span className="text-[11px] text-muted-foreground font-normal">
            — hover a tooth for diagnoses & procedure history
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center gap-3 flex-wrap">
              {renderQuadrant(PERMANENT_TEETH.upperRight, 'permanent', 'Q1 (UR)')}
              <div className="w-px bg-border self-stretch" />
              {renderQuadrant(PERMANENT_TEETH.upperLeft, 'permanent', 'Q2 (UL)')}
            </div>
            <div className="flex justify-center">
              <div className="w-4/5 h-px bg-border" />
            </div>
            <div className="flex justify-center gap-3 flex-wrap">
              {renderQuadrant(PERMANENT_TEETH.lowerRight, 'permanent', 'Q4 (LR)')}
              <div className="w-px bg-border self-stretch" />
              {renderQuadrant(PERMANENT_TEETH.lowerLeft, 'permanent', 'Q3 (LL)')}
            </div>
            <div className="pt-2">
              <DentalChartLegend />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PatientCurrentStateChart;
