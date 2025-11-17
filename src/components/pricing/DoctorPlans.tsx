import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PlanCard } from "./PlanCard";
import { Skeleton } from "@/components/ui/skeleton";

interface DoctorPlansProps {
  billingPeriod: "monthly" | "yearly";
}

export const DoctorPlans = ({ billingPeriod }: DoctorPlansProps) => {
  const { data: plans, isLoading } = useQuery({
    queryKey: ['doctor-plans', billingPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('target_audience', 'doctor')
        .eq('billing_interval', billingPeriod)
        .eq('is_active', true)
        .order('price');
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <section className="space-y-8">
        <div className="text-center">
          <Skeleton className="h-8 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[600px]" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          For Doctors
        </h2>
        <p className="text-muted-foreground text-lg">
          Streamline your practice with powerful tools and EMR
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {plans?.map((plan, index) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            popular={index === 1}
            billingPeriod={billingPeriod}
          />
        ))}
      </div>
    </section>
  );
};
