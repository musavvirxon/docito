import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { History, Stethoscope, Activity, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  patientId: string;
  excludeAppointmentId?: string;
}

interface DiagnosisItem {
  id: string;
  title: string;
  notes: string | null;
  created_at: string;
  doctor_id: string;
  appointment_id: string;
  icd10_code: string | null;
}

interface ProcedureItem {
  id: string;
  name: string;
  cost: number | null;
  status: string;
  created_at: string;
  doctor_id: string | null;
  appointment_id: string | null;
}

/**
 * Read-only history list of all past diagnoses and procedures for a patient
 * across every doctor and appointment. Shown to non-dentist specialists in
 * the diagnosis tab so they have full clinical context.
 */
export function PatientClinicalHistoryList({ patientId, excludeAppointmentId }: Props) {
  const [loading, setLoading] = useState(true);
  const [diagnoses, setDiagnoses] = useState<DiagnosisItem[]>([]);
  const [procedures, setProcedures] = useState<ProcedureItem[]>([]);
  const [doctorMap, setDoctorMap] = useState<Record<string, { name: string; specialty?: string }>>({});

  useEffect(() => {
    let cancelled = false;
    if (!patientId) return;

    (async () => {
      setLoading(true);
      try {
        // 1. Get all of this patient's appointment ids first (used to scope
        //    appointment_procedures, which has no direct patient_id column).
        const { data: apptRows } = await supabase
          .from('appointments')
          .select('id, doctor_id')
          .eq('patient_id', patientId)
          .limit(500);
        const apptIds = (apptRows || []).map((a: any) => a.id);
        const apptDoctorMap: Record<string, string> = {};
        for (const a of (apptRows || []) as any[]) {
          apptDoctorMap[a.id] = a.doctor_id;
        }

        const [diagRes, apptProcRes, dentalProcRes] = await Promise.all([
          supabase
            .from('appointment_diagnoses')
            .select('id, diagnosis_title, icd10_code, notes, created_at, doctor_id, appointment_id')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(100),
          apptIds.length > 0
            ? supabase
                .from('appointment_procedures')
                .select('id, procedure_notes, estimated_cost, status, created_at, appointment_id, prescribed_by')
                .in('appointment_id', apptIds)
                .order('created_at', { ascending: false })
                .limit(100)
            : Promise.resolve({ data: [] as any[] }),
          supabase
            .from('tooth_procedure_history')
            .select('id, procedure_name, cost, status, created_at, doctor_id, appointment_id')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(100),
        ]);

        if (cancelled) return;

        const diagList: DiagnosisItem[] = (diagRes.data || []).map((d: any) => ({
          id: d.id,
          title: d.diagnosis_title,
          icd10_code: d.icd10_code,
          notes: d.notes,
          created_at: d.created_at,
          doctor_id: d.doctor_id,
          appointment_id: d.appointment_id,
        }));

        const apptProcList: ProcedureItem[] = ((apptProcRes as any).data || []).map((p: any) => ({
          id: p.id,
          name: p.procedure_notes || 'Procedure',
          cost: p.estimated_cost,
          status: p.status,
          created_at: p.created_at,
          doctor_id: p.prescribed_by || apptDoctorMap[p.appointment_id] || null,
          appointment_id: p.appointment_id,
        }));

        const dentalProcList: ProcedureItem[] = ((dentalProcRes as any).data || []).map((p: any) => ({
          id: p.id,
          name: p.procedure_name,
          cost: p.cost,
          status: p.status,
          created_at: p.created_at,
          doctor_id: p.doctor_id,
          appointment_id: p.appointment_id,
        }));

        const procList: ProcedureItem[] = [...apptProcList, ...dentalProcList].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        const filteredDiag = excludeAppointmentId
          ? diagList.filter((d) => d.appointment_id !== excludeAppointmentId)
          : diagList;
        const filteredProc = excludeAppointmentId
          ? procList.filter((p) => p.appointment_id !== excludeAppointmentId)
          : procList;

        // Hydrate doctor names
        const ids = Array.from(
          new Set([
            ...filteredDiag.map((d) => d.doctor_id),
            ...filteredProc.map((p) => p.doctor_id).filter(Boolean) as string[],
          ]),
        );
        if (ids.length > 0) {
          const { data: dpv } = await supabase
            .from('doctor_profiles_view')
            .select('id, full_name, specialty')
            .in('id', ids);
          const map: Record<string, { name: string; specialty?: string }> = {};
          for (const d of (dpv || []) as any[]) {
            map[d.id] = { name: d.full_name, specialty: d.specialty };
          }
          if (!cancelled) setDoctorMap(map);
        }

        if (!cancelled) {
          setDiagnoses(filteredDiag);
          setProcedures(filteredProc);
        }
      } catch (err) {
        console.error('Error loading patient clinical history:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [patientId, excludeAppointmentId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" /> Patient Clinical History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isEmpty = diagnoses.length === 0 && procedures.length === 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4" /> Patient Clinical History
          <span className="text-[11px] text-muted-foreground font-normal">
            — across all doctors & appointments
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No past diagnoses or procedures recorded for this patient.
          </div>
        ) : (
          <div className="space-y-4">
            {diagnoses.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5" /> Diagnoses ({diagnoses.length})
                </div>
                <div className="space-y-2">
                  {diagnoses.map((d) => {
                    const doc = doctorMap[d.doctor_id];
                    return (
                      <div
                        key={d.id}
                        className="rounded-md border border-border bg-card/40 p-3 space-y-1"
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="font-medium text-sm flex items-center gap-2">
                            {d.title}
                            {d.icd10_code && (
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {d.icd10_code}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(d.created_at), 'MMM d, yyyy')}
                          </div>
                        </div>
                        {d.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{d.notes}</p>
                        )}
                        {doc && (
                          <p className="text-[11px] text-muted-foreground">
                            Dr. {doc.name}
                            {doc.specialty ? ` · ${doc.specialty}` : ''}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {procedures.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" /> Procedures ({procedures.length})
                </div>
                <div className="space-y-2">
                  {procedures.map((p) => {
                    const doc = p.doctor_id ? doctorMap[p.doctor_id] : null;
                    return (
                      <div
                        key={p.id}
                        className="rounded-md border border-border bg-card/40 p-3 space-y-1"
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="font-medium text-sm">{p.name}</div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px] capitalize">
                              {p.status}
                            </Badge>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(p.created_at), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </div>
                        {doc && (
                          <p className="text-[11px] text-muted-foreground">
                            Dr. {doc.name}
                            {doc.specialty ? ` · ${doc.specialty}` : ''}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PatientClinicalHistoryList;
