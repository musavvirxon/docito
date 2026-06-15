// File: src/components/patient/PatientTreatmentPlans.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardList, 
  Calendar, 
  DollarSign, 
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  User,
  Download,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { downloadTreatmentPlanPdf } from '@/lib/api/treatment-plan-api';
import { useCurrency } from '@/hooks/useCurrency';

interface TreatmentPlanProcedure {
  id: string;
  cost: number | null;
  notes: string | null;
  status: string;
  procedure: {
    name: string;
    category: string;
  } | null;
}

interface TreatmentPlan {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  total_cost: number | null;
  estimated_completion_date: string | null;
  created_at: string;
  doctor: {
    id: string;
    specialty: string;
    user_id: string;
  } | null;
  procedures_count?: number;
  completed_count?: number;
  verification_code?: string | null;
}

export const PatientTreatmentPlans = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation("patients");
  const { format: fmtMoney } = useCurrency();
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [viewPlan, setViewPlan] = useState<TreatmentPlan | null>(null);
  const [planProcedures, setPlanProcedures] = useState<TreatmentPlanProcedure[]>([]);
  const [loadingProcedures, setLoadingProcedures] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPlans();
    }
  }, [user]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          doctor:doctors(id, specialty, user_id)
        `)
        .eq('patient_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching treatment plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProcedures = async (planId: string) => {
    setLoadingProcedures(true);
    try {
      const { data, error } = await supabase
        .from('treatment_plan_procedures')
        .select(`
          id,
          cost,
          notes,
          status,
          procedure:procedures(name, category)
        `)
        .eq('treatment_plan_id', planId)
        .order('sequence_order');

      if (error) throw error;
      setPlanProcedures(data || []);
    } catch (error) {
      console.error('Error fetching procedures:', error);
      toast.error(t('treatmentPlans.loadProceduresFailed'));
    } finally {
      setLoadingProcedures(false);
    }
  };

  const handleViewPlan = async (plan: TreatmentPlan) => {
    setViewPlan(plan);
    await fetchProcedures(plan.id);
  };

  const handleDownloadPDF = async (plan: TreatmentPlan) => {
    toast.loading(t('treatmentPlans.generatingPdf'), { id: 'tp-pdf' });
    try {
      const locale = (i18n.language || 'en').toLowerCase();
      const code = (plan.verification_code || plan.id || '').slice(0, 18);
      const fileName = code ? `treatment-plan_${code}.pdf` : `treatment-plan_${plan.id}.pdf`;

      await downloadTreatmentPlanPdf({
        treatmentPlanId: plan.id,
        locale,
        fileName,
      });

      toast.success(t('treatmentPlans.pdfSuccess'), { id: 'tp-pdf' });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error(t('treatmentPlans.pdfFailed'), { id: 'tp-pdf' });
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: React.ElementType; label: string }> = {
      pending: {
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: Clock,
        label: t('treatmentPlans.statusLabels.pending'),
      },
      active: {
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        icon: AlertCircle,
        label: t('treatmentPlans.statusLabels.active'),
      },
      completed: {
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        icon: CheckCircle2,
        label: t('treatmentPlans.statusLabels.completed'),
      },
      cancelled: {
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        icon: AlertCircle,
        label: t('treatmentPlans.statusLabels.cancelled'),
      },
    };
    return configs[status] || configs.pending;
  };

  const getCardClassName = (isSelected: boolean): string => {
    const base = "hover:shadow-md transition-all cursor-pointer";
    return isSelected ? `${base} ring-2 ring-primary` : base;
  };

  const getChevronClassName = (isSelected: boolean): string => {
    const base = "h-5 w-5 text-muted-foreground transition-transform";
    return isSelected ? `${base} rotate-90` : base;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('treatmentPlans.title')}</h2>
        <p className="text-muted-foreground">{t('treatmentPlans.subtitle')}</p>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-semibold mb-2">{t('treatmentPlans.emptyTitle')}</h3>
            <p className="text-muted-foreground text-sm">
              {t('treatmentPlans.emptyDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => {
            const statusConfig = getStatusConfig(plan.status);
            const StatusIcon = statusConfig.icon;
            const progress = plan.procedures_count 
              ? Math.round((plan.completed_count || 0) / plan.procedures_count * 100)
              : 0;
            const isSelected = selectedPlan === plan.id;
            const cardClassName = getCardClassName(isSelected);
            const chevronClassName = getChevronClassName(isSelected);
            const statusClassName = `inline-flex items-center text-xs px-2 py-0.5 rounded-md ${statusConfig.color}`;

            return (
              <Card 
                key={plan.id} 
                className={cardClassName}
                onClick={() => setSelectedPlan(isSelected ? null : plan.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <ClipboardList className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{plan.title}</h3>
                            {React.createElement('span', { className: statusClassName }, [
                              React.createElement(StatusIcon, { key: 'icon', className: "h-3 w-3 mr-1" }),
                              statusConfig.label
                            ])}
                          </div>
                          {plan.notes && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {plan.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {plan.status === 'active' && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('treatmentPlans.progress')}</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{t('treatmentPlans.created', { date: new Date(plan.created_at).toLocaleDateString(i18n.language, { month: 'short', day: '2-digit', year: 'numeric' }) })}</span>
                        </div>
                        {plan.total_cost && plan.total_cost > 0 && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span>{fmtMoney(plan.total_cost)}</span>
                          </div>
                        )}
                        {plan.doctor && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{plan.doctor.specialty}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <ChevronRight className={chevronClassName} />
                  </div>

                  {isSelected && (
                    <div className="mt-6 pt-6 border-t space-y-4">
                      <h4 className="font-medium">{t('treatmentPlans.treatmentProcedures')}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t('treatmentPlans.clickToView')}
                      </p>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" className="gap-2" onClick={() => handleViewPlan(plan)}>
                          <Eye className="h-4 w-4" />
                          {t('treatmentPlans.viewFullPlan')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleDownloadPDF(plan)}
                        >
                          <Download className="h-4 w-4" />
                          {t('treatmentPlans.downloadPdf')}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Treatment Plan Detail Dialog */}
      <Dialog open={!!viewPlan} onOpenChange={(open) => !open && setViewPlan(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {viewPlan?.title}
            </DialogTitle>
            <DialogDescription>
              {t('treatmentPlans.dialogDesc')}
            </DialogDescription>
          </DialogHeader>

          {viewPlan && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">{t('treatmentPlans.status')}</p>
                  <Badge className="mt-1">{getStatusConfig(viewPlan.status).label}</Badge>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">{t('treatmentPlans.totalCost')}</p>
                  <p className="font-semibold mt-1">
                    {viewPlan.total_cost ? fmtMoney(viewPlan.total_cost) : t('treatmentPlans.na')}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">{t('treatmentPlans.createdLabel')}</p>
                  <p className="font-semibold mt-1">
                    {new Date(viewPlan.created_at).toLocaleDateString(i18n.language, { month: 'short', day: '2-digit', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {viewPlan.notes && (
                <div>
                  <h4 className="font-medium mb-2">{t('treatmentPlans.notes')}</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {viewPlan.notes}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-3">{t('treatmentPlans.procedures')}</h4>
                {loadingProcedures ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : planProcedures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('treatmentPlans.noProcedures')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('treatmentPlans.procedure')}</TableHead>
                        <TableHead>{t('treatmentPlans.category')}</TableHead>
                        <TableHead>{t('treatmentPlans.cost')}</TableHead>
                        <TableHead>{t('treatmentPlans.status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planProcedures.map((proc) => (
                        <TableRow key={proc.id}>
                          <TableCell className="font-medium">
                            {proc.procedure?.name || t('treatmentPlans.na')}
                          </TableCell>
                          <TableCell>{proc.procedure?.category || t('treatmentPlans.na')}</TableCell>
                          <TableCell>
                            {proc.cost ? fmtMoney(proc.cost) : t('treatmentPlans.na')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={proc.status === 'completed' ? 'default' : 'secondary'}>
                              {getStatusConfig(proc.status).label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadPDF(viewPlan)}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t('treatmentPlans.downloadPdf')}
                </Button>
                <Button onClick={() => setViewPlan(null)}>{t('treatmentPlans.close')}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
