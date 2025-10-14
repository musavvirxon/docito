import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PracticeInvitation {
  id: string;
  practice_id: string;
  invited_user_id: string | null;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  role: string;
  custom_message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'awaitingSignup' | 'expired';
  invite_type: 'existingUser' | 'newUser';
  invited_by: string;
  invite_token: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export const usePracticeInvitations = (practiceId?: string) => {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<PracticeInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvitations = async () => {
    if (!practiceId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('practice_invitations' as any)
        .select('*')
        .eq('practice_id', practiceId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching invitations:', error);
        // Don't show error if table doesn't exist yet (during initial setup)
        if (!error.message?.includes('does not exist')) {
          toast({
            title: 'Error',
            description: 'Failed to load invitations',
            variant: 'destructive',
          });
        }
        setInvitations([]);
      } else {
        setInvitations((data as any[]) || []);
      }
    } catch (error: any) {
      console.error('Error fetching invitations:', error);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async (invitationData: {
    email: string;
    phone?: string;
    full_name?: string;
    role: string;
    custom_message?: string;
  }) => {
    if (!practiceId) return { success: false, error: 'No practice ID' };

    try {
      // Check if user exists
      const { data: existingUser } = await supabase.rpc('check_user_exists' as any, {
        p_email: invitationData.email,
        p_phone: invitationData.phone || null,
      }) as any;

      const inviteType = existingUser?.[0]?.exists ? 'existingUser' : 'newUser';
      const invitedUserId = existingUser?.[0]?.user_id || null;

      // Generate invite token
      const inviteToken = crypto.randomUUID();

      // Create invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('practice_invitations' as any)
        .insert({
          practice_id: practiceId,
          invited_user_id: invitedUserId,
          email: invitationData.email,
          phone: invitationData.phone,
          full_name: invitationData.full_name,
          role: invitationData.role,
          custom_message: invitationData.custom_message,
          status: inviteType === 'existingUser' ? 'pending' : 'awaitingSignup',
          invite_type: inviteType,
          invited_by: (await supabase.auth.getUser()).data.user?.id,
          invite_token: inviteToken,
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Get practice and inviter info for email
      const { data: practice } = await supabase
        .from('practices')
        .select('name')
        .eq('id', practiceId)
        .single();

      const { data: inviter } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      // Send email invitation
      await supabase.functions.invoke('send-invitation-email', {
        body: {
          to: invitationData.email,
          inviteeName: invitationData.full_name || 'there',
          clinicName: practice?.name || 'Our Practice',
          role: invitationData.role,
          inviterName: inviter?.full_name || 'Practice Admin',
          customMessage: invitationData.custom_message,
          inviteToken,
          isExistingUser: inviteType === 'existingUser',
          platformUrl: window.location.origin,
        },
      });

      // If existing user, send in-app notification
      if (inviteType === 'existingUser' && invitedUserId) {
        await supabase.rpc('send_notification_to_user', {
          recipient_user_id: invitedUserId,
          notification_type: 'practice_invitation',
          title: 'Practice Invitation',
          message: `You've been invited to join ${practice?.name} as a ${invitationData.role}`,
          data: { invitation_id: (invitation as any).id, practice_id: practiceId },
        });
      }

      toast({
        title: 'Invitation Sent',
        description: `Invitation sent to ${invitationData.email}`,
      });

      await fetchInvitations();
      return { success: true, data: invitation };
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      const invitation = invitations.find(i => i.id === invitationId);
      if (!invitation) throw new Error('Invitation not found');

      // Get practice and inviter info
      const { data: practice } = await supabase
        .from('practices')
        .select('name')
        .eq('id', practiceId)
        .single();

      const { data: inviter } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', invitation.invited_by)
        .single();

      // Resend email
      await supabase.functions.invoke('send-invitation-email', {
        body: {
          to: invitation.email,
          inviteeName: invitation.full_name || 'there',
          clinicName: practice?.name || 'Our Practice',
          role: invitation.role,
          inviterName: inviter?.full_name || 'Practice Admin',
          customMessage: invitation.custom_message,
          inviteToken: invitation.invite_token,
          isExistingUser: invitation.invite_type === 'existingUser',
          platformUrl: window.location.origin,
        },
      });

      toast({
        title: 'Invitation Resent',
        description: 'The invitation has been sent again',
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to resend invitation',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('practice_invitations' as any)
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: 'Invitation Cancelled',
        description: 'The invitation has been cancelled',
      });

      await fetchInvitations();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to cancel invitation',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    fetchInvitations();

    // Subscribe to real-time updates
    if (practiceId) {
      const channel = supabase
        .channel('practice-invitations-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'practice_invitations',
            filter: `practice_id=eq.${practiceId}`,
          },
          () => {
            fetchInvitations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [practiceId]);

  return {
    invitations,
    loading,
    sendInvitation,
    resendInvitation,
    cancelInvitation,
    refetch: fetchInvitations,
  };
};