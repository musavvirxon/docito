// File: src/hooks/useStaffInvitations.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type EntityType = 'practice' | 'pharmacy' | 'lab' | 'imaging_center';

export interface StaffInvitation {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  invited_user_id: string | null;
  email: string;
  phone: string | null;
  full_name: string | null;
  role: string;
  custom_message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'awaiting_signup';
  invite_type: 'existing_user' | 'new_user';
  invited_by: string | null;
  invite_token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at?: string;
  permissions?: Record<string, any>;
}

export const entityDashboardRoutes: Record<EntityType, string> = {
  practice: '/staff-dashboard',
  pharmacy: '/pharmacy/dashboard',
  lab: '/lab/dashboard',
  imaging_center: '/imaging/dashboard',
};

interface UseStaffInvitationsOptions {
  entityType: EntityType;
  entityId?: string;
}

export const useStaffInvitations = ({ entityType, entityId }: UseStaffInvitationsOptions) => {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvitations = async () => {
    if (!entityId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('staff-management', {
        body: { action: 'list_invites', entityType, entityId },
      });
      if (error) throw error;
      setInvitations((data?.invitations as StaffInvitation[]) || []);
    } catch (err) {
      console.error(err);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const sendInvitation = async (invitationData: {
    email: string;
    phone?: string;
    full_name?: string;
    role: string;
    custom_message?: string;
    permissions?: Record<string, any>;
  }) => {
    if (!entityId) return { success: false, error: 'No entity ID' };

    try {
      const { data, error } = await supabase.functions.invoke('staff-management', {
        body: {
          action: 'create_invite',
          entityType,
          entityId,
          email: invitationData.email,
          phone: invitationData.phone,
          fullName: invitationData.full_name,
          role: invitationData.role,
          customMessage: invitationData.custom_message,
          permissions: invitationData.permissions || {},
          sendEmail: true,
          platformUrl: window.location.origin,
        },
      });
      if (error) throw error;

      toast({ title: 'Invitation Sent', description: `Invitation sent to ${invitationData.email}` });
      await fetchInvitations();
      return { success: true, data: data?.invite as StaffInvitation };
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Failed to send invitation',
        variant: 'destructive',
      });
      return { success: false, error: err?.message || 'Failed to send invitation' };
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    if (!entityId) return { success: false, error: 'No entity ID' };

    try {
      const { error } = await supabase.functions.invoke('staff-management', {
        body: { action: 'cancel_invite', entityType, entityId, invitationId },
      });
      if (error) throw error;

      toast({ title: 'Invitation Cancelled', description: 'The invitation has been cancelled' });
      await fetchInvitations();
      return { success: true };
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Failed to cancel invitation',
        variant: 'destructive',
      });
      return { success: false, error: err?.message || 'Failed to cancel invitation' };
    }
  };

  return {
    invitations,
    loading,
    fetchInvitations,
    sendInvitation,
    cancelInvitation,
  };
};

export const useAcceptStaffInvitation = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const acceptInvitation = async (inviteToken: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('accept_staff_invitation', {
        p_invite_token: inviteToken,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; entity_type?: string };
      if (!result.success) throw new Error(result.error || 'Failed to accept invitation');

      toast({ title: 'Welcome!', description: 'You have successfully joined the organization' });

      const entityType = (result.entity_type as EntityType) || 'practice';
      return { success: true, entityType, dashboardRoute: entityDashboardRoutes[entityType] || '/staff-dashboard' };
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to accept invitation', variant: 'destructive' });
      return { success: false, error: err?.message || 'Failed to accept invitation' };
    } finally {
      setLoading(false);
    }
  };

  return { acceptInvitation, loading };
};

export const getInvitationByToken = async (token: string): Promise<StaffInvitation | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('staff-management', {
      body: { action: 'get_invite', token },
    });
    if (error) return null;
    return (data?.invite as StaffInvitation) || null;
  } catch {
    return null;
  }
};
