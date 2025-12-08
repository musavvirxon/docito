import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAcceptInvitation = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const acceptInvitation = async (inviteToken: string) => {
    setLoading(true);
    
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Store token and redirect to auth
        sessionStorage.setItem('pending_invite_token', inviteToken);
        toast.info('Please sign in or create an account to accept this invitation');
        navigate('/auth', { state: { returnTo: `/accept-invite/${inviteToken}` } });
        return { success: false, needsAuth: true };
      }
      
      // Accept the invitation
      const { data, error } = await supabase.rpc('accept_practice_invitation', {
        p_invite_token: inviteToken,
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; practice_id?: string; role?: string; error?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to accept invitation');
      }
      
      toast.success('Successfully joined the practice!');
      
      // Redirect based on role
      const role = result.role?.toLowerCase();
      if (role === 'receptionist' || role === 'nurse' || role === 'billing_manager') {
        navigate('/staff-dashboard');
      } else if (role === 'doctor') {
        navigate('/doctor-dashboard');
      } else {
        navigate('/dashboard');
      }
      
      return { success: true, practiceId: result.practice_id, role: result.role };
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || 'Failed to accept invitation');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const checkPendingInvitation = async () => {
    const pendingToken = sessionStorage.getItem('pending_invite_token');
    if (pendingToken) {
      sessionStorage.removeItem('pending_invite_token');
      return acceptInvitation(pendingToken);
    }
    return null;
  };

  return {
    acceptInvitation,
    checkPendingInvitation,
    loading,
  };
};
