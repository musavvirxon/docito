import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ClipboardList, 
  Calendar, 
  DollarSign, 
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
}

export const PatientTreatmentPlans = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

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

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: React.ElementType; label: string }> = {
      pending: { 
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', 
        icon: Clock, 
        label: 'Pending' 
      },
      active: { 
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', 
        icon: AlertCircle, 
        label: 'In Progress' 
      },
      completed: { 
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', 
        icon: CheckCircle2, 
        label: 'Completed' 
      },
      cancelled: { 
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', 
        icon: AlertCircle, 
        label: 'Cancelled' 
      },
    };
    return configs[status] || configs.pending;
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
        <h2 className="text-2xl font-bold">Treatment Plans</h2>
        <p className="text-muted-foreground">View your treatment plans and track progress</p>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-semibold mb-2">No Treatment Plans</h3>
            <p className="text-muted-foreground text-sm">
              Your treatment plans will appear here after your doctor creates them
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

            return (
              <Card 
                key={plan.id} 
                className={cn(
                  "hover:shadow-md transition-all cursor-pointer",
                  selectedPlan === plan.id && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
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
                            <Badge className={cn('text-xs', statusConfig.color)}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                          {plan.notes && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {plan.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {plan.status === 'active' && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}

                      {/* Plan Details */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Created {format(new Date(plan.created_at), 'MMM dd, yyyy')}</span>
                        </div>
                        {plan.total_cost && plan.total_cost > 0 && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span>${plan.total_cost.toLocaleString()}</span>
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

                    <ChevronRight className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform",
                      selectedPlan === plan.id && "rotate-90"
                    )} />
                  </div>

                  {/* Expanded Details */}
                  {selectedPlan === plan.id && (
                    <div className="mt-6 pt-6 border-t space-y-4">
                      <h4 className="font-medium">Treatment Procedures</h4>
                      <p className="text-sm text-muted-foreground">
                        Detailed procedure information will be displayed here
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm">View Full Plan</Button>
                        <Button variant="outline" size="sm">
                          Download PDF
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
    </div>
  );
};
