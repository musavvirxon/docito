import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BillingTransaction {
  id: string;
  user_id: string;
  practice_id: string | null;
  appointment_id: string | null;
  subscription_id: string | null;
  payment_hold_id: string | null;
  amount: number;
  currency: string;
  transaction_type: 'appointment_payment' | 'subscription_payment' | 'refund' | 'hold_capture' | 'hold_release' | 'cancellation_fee';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  description: string | null;
  provider_transaction_id: string | null;
  provider_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface EntityFilter {
  entityType?: string;
  entityId?: string;
}

export const useBillingTransactions = (userId?: string, practiceId?: string, entityFilter?: EntityFilter) => {
  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ['billing-transactions', userId, practiceId, entityFilter?.entityType, entityFilter?.entityId],
    queryFn: async () => {
      let query = supabase
        .from('billing_transactions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      if (practiceId) {
        query = query.eq('practice_id', practiceId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as BillingTransaction[];
    },
    enabled: !!(userId || practiceId || (entityFilter?.entityType && entityFilter?.entityId)),
  });

  const totalRevenue = transactions?.reduce((sum, t) => {
    if (t.status === 'completed' && ['appointment_payment', 'subscription_payment', 'hold_capture'].includes(t.transaction_type)) {
      return sum + t.amount;
    }
    return sum;
  }, 0) || 0;

  const totalRefunds = transactions?.reduce((sum, t) => {
    if (['refund', 'hold_release'].includes(t.transaction_type) && t.status === 'completed') {
      return sum + t.amount;
    }
    return sum;
  }, 0) || 0;

  return {
    transactions,
    isLoading,
    refetch,
    totalRevenue,
    totalRefunds,
    netRevenue: totalRevenue - totalRefunds,
  };
};
