import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AppRole } from '@/components/RoleProtectedRoute';

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
  updated_at: string;
}

// Role options for each entity type
export const entityRoleOptions: Record<EntityType, { value: string; label: string }[]> = {
  practice: [
    { value: 'clinic_staff', label: 'Clinic Staff' },
    { value: 'receptionist', label: 'Receptionist' },
    { value: 'nurse', label: 'Nurse' },
    { value: 'billing_manager', label: 'Billing Manager' },
    { value: 'doctor', label: 'Doctor' },
  ],
  pharmacy: [
    { value: 'pharmacy_staff', label: 'Pharmacy Staff' },
    { value: 'pharmacist', label: 'Pharmacist' },
  ],
  lab: [
    { value: 'lab_staff', label: 'Lab Staff' },
    { value: 'lab_technician', label: 'Lab Technician' },
    { value: 'internal_lab_tech', label: 'Internal Lab Tech' },
  ],
  imaging_center: [
    { value: 'imaging_staff', label: 'Imaging Staff' },
    { value: 'internal_imaging_tech', label: 'Imaging Technician' },
  ],
};

// Dashboard routes for each entity type
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
      const { data, error } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations((data as StaffInvitation[]) || []);
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
    if (!entityId) return { success: false, error: 'No entity ID' };

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Check if user already exists with this email
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', invitationData.email)
        .single();

      const inviteType = existingProfile ? 'existing_user' : 'new_user';
      const status = existingProfile ? 'pending' : 'awaiting_signup';

      // Create invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('staff_invitations')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          invited_user_id: existingProfile?.user_id || null,
          email: invitationData.email,
          phone: invitationData.phone || null,
          full_name: invitationData.full_name || null,
          role: invitationData.role,
          custom_message: invitationData.custom_message || null,
          status,
          invite_type: inviteType,
          invited_by: userId,
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Get entity name for email
      let entityName = 'Organization';
      if (entityType === 'practice') {
        const { data } = await supabase.from('practices').select('name').eq('id', entityId).single();
        entityName = data?.name || entityName;
      } else if (entityType === 'pharmacy') {
        const { data } = await supabase.from('pharmacies').select('name').eq('id', entityId).single();
        entityName = data?.name || entityName;
      } else if (entityType === 'lab') {
        const { data } = await supabase.from('lab_centers').select('name').eq('id', entityId).single();
        entityName = data?.name || entityName;
      } else if (entityType === 'imaging_center') {
        const { data } = await supabase.from('imaging_centers').select('name').eq('id', entityId).single();
        entityName = data?.name || entityName;
      }

      // Get inviter name
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .single();

      // Send email invitation via edge function
      try {
        await supabase.functions.invoke('send-staff-invitation', {
          body: {
            to: invitationData.email,
            inviteeName: invitationData.full_name || 'there',
            entityName,
            entityType,
            role: invitationData.role,
            inviterName: inviterProfile?.full_name || 'Admin',
            customMessage: invitationData.custom_message,
            inviteToken: (invitation as StaffInvitation).invite_token,
            isExistingUser: inviteType === 'existing_user',
            platformUrl: window.location.origin,
          },
        });
      } catch (emailError) {
        console.warn('Email notification failed, but invitation was created:', emailError);
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

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('staff_invitations')
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

  const resendInvitation = async (invitationId: string) => {
    const invitation = invitations.find(i => i.id === invitationId);
    if (!invitation) return { success: false, error: 'Invitation not found' };

    try {
      // Get entity name
      let entityName = 'Organization';
      if (entityType === 'practice') {
        const { data } = await supabase.from('practices').select('name').eq('id', entityId).single();
        entityName = data?.name || entityName;
      } else if (entityType === 'pharmacy') {
        const { data } = await supabase.from('pharmacies').select('name').eq('id', entityId).single();
        entityName = data?.name || entityName;
      } else if (entityType === 'lab') {
        const { data } = await supabase.from('lab_centers').select('name').eq('id', entityId).single();
        entityName = data?.name || entityName;
      } else if (entityType === 'imaging_center') {
        const { data } = await supabase.from('imaging_centers').select('name').eq('id', entityId).single();
        entityName = data?.name || entityName;
      }

      // Get inviter name
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', invitation.invited_by)
        .single();

      await supabase.functions.invoke('send-staff-invitation', {
        body: {
          to: invitation.email,
          inviteeName: invitation.full_name || 'there',
          entityName,
          entityType,
          role: invitation.role,
          inviterName: inviterProfile?.full_name || 'Admin',
          customMessage: invitation.custom_message,
          inviteToken: invitation.invite_token,
          isExistingUser: invitation.invite_type === 'existing_user',
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

  useEffect(() => {
    fetchInvitations();

    // Subscribe to real-time updates
    if (entityId) {
      const channel = supabase
        .channel(`staff-invitations-${entityType}-${entityId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'staff_invitations',
            filter: `entity_id=eq.${entityId}`,
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
  }, [entityId, entityType]);

  return {
    invitations,
    loading,
    sendInvitation,
    cancelInvitation,
    resendInvitation,
    refetch: fetchInvitations,
    roleOptions: entityRoleOptions[entityType],
  };
};

// Hook to accept a staff invitation
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

      const result = data as { success: boolean; error?: string; entity_type?: string; role?: string };

      if (!result.success) {
        throw new Error(result.error || 'Failed to accept invitation');
      }

      toast({
        title: 'Welcome!',
        description: 'You have successfully joined the organization',
      });

      return { 
        success: true, 
        entityType: result.entity_type as EntityType,
        dashboardRoute: entityDashboardRoutes[result.entity_type as EntityType] || '/staff-dashboard',
      };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept invitation',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return { acceptInvitation, loading };
};

// Fetch invitation by token (for signup flow)
export const getInvitationByToken = async (token: string): Promise<StaffInvitation | null> => {
  const { data, error } = await supabase
    .from('staff_invitations')
    .select('*')
    .eq('invite_token', token)
    .single();

  if (error || !data) return null;
  return data as StaffInvitation;
};
