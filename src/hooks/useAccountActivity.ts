import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AccountActivity {
  id: string;
  user_id: string;
  activity_type: string;
  ip_address: string | null;
  user_agent: string | null;
  device_info: string | null;
  location: string | null;
  created_at: string;
}

export interface AccountRequest {
  id: string;
  user_id: string;
  request_type: 'deactivation' | 'data_export';
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  requested_at: string;
  completed_at: string | null;
  notes: string | null;
}

export function useAccountActivity() {
  const queryClient = useQueryClient();

  // Fetch activity logs
  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['account-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_activity')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as AccountActivity[];
    }
  });

  // Fetch account requests
  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['account-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AccountRequest[];
    }
  });

  // Log activity
  const logActivity = useMutation({
    mutationFn: async (activityType: string) => {
      const { data, error } = await supabase.rpc('log_account_activity', {
        p_activity_type: activityType
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-activity'] });
    }
  });

  // Request account action
  const requestAccountAction = useMutation({
    mutationFn: async ({ 
      requestType, 
      notes 
    }: { 
      requestType: 'deactivation' | 'data_export'; 
      notes?: string 
    }) => {
      const { data, error } = await supabase.rpc('request_account_action', {
        p_request_type: requestType,
        p_notes: notes
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['account-requests'] });
      
      if (variables.requestType === 'deactivation') {
        toast.success('Account deactivation request submitted');
      } else {
        toast.success('Data export request submitted. You will receive an email shortly.');
      }
    },
    onError: (error: any) => {
      toast.error('Failed to submit request: ' + error.message);
    }
  });

  return {
    activities,
    requests,
    loadingActivities,
    loadingRequests,
    logActivity: logActivity.mutate,
    requestAccountAction: requestAccountAction.mutate,
    isSubmittingRequest: requestAccountAction.isPending
  };
}
