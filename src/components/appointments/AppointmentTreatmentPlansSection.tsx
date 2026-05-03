import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, FileText, Eye, Trash2, RefreshCcw, Users, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EnhancedCreateTreatmentPlanModal from '@/components/treatment/EnhancedCreateTreatmentPlanModal';
import EnhancedTreatmentPlanDetailModal from '@/components/treatment/EnhancedTreatmentPlanDetailModal';

interface Props {
  doctorId: string;
  doctorAuthUserId?: string | null;
  patientId?: string | null;
  doctorPatientId?: string | null;
  patientName?: string;
  /** Dentists get full create/manage UI; non-dentists get a read-only list. */
  canManage: boolean;
}

interface TreatmentPlanRow {
  id: string;
  doctor_id: string | null;
  patient_id: string | null;
  doctor_patient_id: string | null;
  title: string;
  notes: string | null;
  description: string | null;
  status: string;
  total_cost: number | null;
  created_at: string;
  priority?: string | null;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    published: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    pending_confirmation: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
    confirmed: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
    in_progress: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
    completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    cancelled: 'bg-red-500/10 text-red-700 dark:text-red-300',
  };
  return map[status] || map.draft;
};

const formatCurrency = (n: number | null) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n || 0));

export function AppointmentTreatmentPlansSection({
  doctorId,
  doctorAuthUserId,
  patientId,
  doctorPatientId,
  patientName,
  canManage,
}: Props) {
  const [plans, setPlans] = useState<TreatmentPlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<TreatmentPlanRow | null>(null);

  const hasPatient = Boolean(patientId || doctorPatientId);

  const fetchPlans = useCallback(async () => {
    if (!hasPatient) {
      setPlans([]);
      return;
    }
    setLoading(true);
    try {
      // Doctor IDs may be either profile id or auth user id depending on data
      const doctorIds = Array.from(new Set([doctorId, doctorAuthUserId].filter(Boolean) as string[]));
      let query = supabase
        .from('treatment_plans')
        .select('*')
        .in('doctor_id', doctorIds)
        .order('created_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      } else if (doctorPatientId) {
        query = query.eq('doctor_patient_id', doctorPatientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPlans((data || []) as TreatmentPlanRow[]);
    } catch (err: any) {
      console.error('Load treatment plans failed', err);
      toast.error(err?.message || 'Failed to load treatment plans');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId, doctorAuthUserId, patientId, doctorPatientId, hasPatient]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this treatment plan?')) return;
    const { error } = await supabase.from('treatment_plans').delete().eq('id', id);
    if (error) {
      toast.error('Delete failed: ' + error.message);
      return;
    }
    toast.success('Treatment plan deleted');
    fetchPlans();
  };

  const preSelectedPatientId = useMemo(
    () => patientId || doctorPatientId || undefined,
    [patientId, doctorPatientId]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Treatment Plans{patientName ? ` — ${patientName}` : ''}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={fetchPlans}
              disabled={loading}
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {canManage && hasPatient && (
              <Button type="button" size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" />
                New Plan
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasPatient ? (
          <p className="text-xs text-muted-foreground border rounded-md p-3">
            No patient linked to this appointment.
          </p>
        ) : plans.length === 0 ? (
          <p className="text-xs text-muted-foreground border rounded-md p-3">
            No treatment plans for this patient yet.
          </p>
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 rounded-lg border bg-muted/30 hover:bg-muted transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{plan.title}</span>
                    <Badge className={statusBadge(plan.status)}>
                      {String(plan.status).replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(plan.created_at).toLocaleDateString()}
                    </span>
                    {plan.total_cost != null && (
                      <span className="font-medium text-foreground">
                        {formatCurrency(plan.total_cost)}
                      </span>
                    )}
                  </div>
                  {(plan.notes || plan.description) && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {plan.notes || plan.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelected(plan)}
                    aria-label="View"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canManage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(plan.id)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {canManage && (
        <EnhancedCreateTreatmentPlanModal
          open={showCreate}
          onOpenChange={setShowCreate}
          onSuccess={() => fetchPlans()}
          preSelectedPatientId={preSelectedPatientId}
        />
      )}

      {selected && (
        <EnhancedTreatmentPlanDetailModal
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
          treatmentPlan={selected as any}
          onUpdate={() => fetchPlans()}
        />
      )}
    </Card>
  );
}

export default AppointmentTreatmentPlansSection;
