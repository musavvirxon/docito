import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PaymentHold {
  id: string;
  user_id: string;
  appointment_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'held' | 'captured' | 'released' | 'refunded' | 'failed';
  payment_provider: string;
  provider_payment_id: string | null;
  provider_hold_id: string | null;
  hold_expires_at: string | null;
  captured_at: string | null;
  released_at: string | null;
  refunded_at: string | null;
  refund_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const usePaymentHolds = (userId?: string) => {
  const queryClient = useQueryClient();

  const { data: holds, isLoading } = useQuery({
    queryKey: ['payment-holds', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('payment_holds')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PaymentHold[];
    },
    enabled: !!userId,
  });

  const createHold = useMutation({
    mutationFn: async ({ appointmentId, amount, currency = 'usd' }: { 
      appointmentId: string; 
      amount: number; 
      currency?: string;
    }) => {
      const { data, error } = await supabase.rpc('create_appointment_hold', {
        p_appointment_id: appointmentId,
        p_amount: amount,
        p_currency: currency,
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; hold_id?: string; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to create hold');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-holds'] });
      toast.success('Payment hold created');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const captureHold = useMutation({
    mutationFn: async (holdId: string) => {
      const { data, error } = await supabase.rpc('capture_payment_hold', {
        p_hold_id: holdId,
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; transaction_id?: string; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to capture payment');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-holds'] });
      queryClient.invalidateQueries({ queryKey: ['billing-transactions'] });
      toast.success('Payment captured successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const releaseHold = useMutation({
    mutationFn: async ({ holdId, reason }: { holdId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('release_payment_hold', {
        p_hold_id: holdId,
        p_reason: reason || 'cancellation',
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; transaction_id?: string; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to release hold');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-holds'] });
      queryClient.invalidateQueries({ queryKey: ['billing-transactions'] });
      toast.success('Payment hold released');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    holds,
    isLoading,
    createHold,
    captureHold,
    releaseHold,
  };
};
