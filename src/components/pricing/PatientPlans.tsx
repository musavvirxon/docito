import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PlanCard } from "./PlanCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

interface PatientPlansProps {
  billingPeriod: "monthly" | "yearly";
}

export const PatientPlans = ({ billingPeriod }: PatientPlansProps) => {
  const { t } = useTranslation('pricing');
  // Fetch free plan separately (price = 0)
  const {
    data: freePlan,
    isLoading: isFreeLoading
  } = useQuery({
    queryKey: ['patient-free-plan'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('subscription_plans').select('*').eq('target_audience', 'patient').eq('price', 0).eq('is_active', true).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  // Fetch paid plans based on billing period
  const {
    data: paidPlans,
    isLoading: isPaidLoading
  } = useQuery({
    queryKey: ['patient-paid-plans', billingPeriod],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('subscription_plans').select('*').eq('target_audience', 'patient').gt('price', 0).eq('billing_interval', billingPeriod).eq('is_active', true).order('price');
      if (error) throw error;
      return data;
    }
  });
  const isLoading = isFreeLoading || isPaidLoading;
  const plans = freePlan ? [freePlan, ...(paidPlans || [])] : paidPlans || [];
  if (isLoading) {
    return <section className="space-y-8">
        <div className="text-center">
          <Skeleton className="h-8 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[600px]" />)}
        </div>
      </section>;
  }
  return <section className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          {t('plans.patients.title')}               
        </h2>
        <p className="text-muted-foreground text-lg">
          {t('plans.patients.subtitle')}
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {plans?.map((plan, index) => <PlanCard key={plan.id} plan={plan} popular={index === 1} billingPeriod={billingPeriod} />)}
      </div>
    </section>;
};