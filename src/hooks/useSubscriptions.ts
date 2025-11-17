import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useSubscriptions = (userId?: string) => {
  const queryClient = useQueryClient();

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: currentSubscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['user-subscription', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!userId,
  });

  const createSubscription = useMutation({
    mutationFn: async (planId: string) => {
      const { data, error } = await supabase.functions.invoke('process-subscription', {
        body: { plan_id: planId, action: 'create' }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      toast.success('Subscription activated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const cancelSubscription = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { data, error } = await supabase.functions.invoke('process-subscription', {
        body: { subscription_id: subscriptionId, action: 'cancel' }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      toast.success('Subscription canceled');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    plans,
    plansLoading,
    currentSubscription,
    subscriptionLoading,
    createSubscription,
    cancelSubscription,
  };
};
