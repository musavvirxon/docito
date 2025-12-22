import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Building2, Pill, FlaskConical, Scan } from 'lucide-react';
import { toast } from 'sonner';
import { useAcceptStaffInvitation, getInvitationByToken, type StaffInvitation, type EntityType, entityDashboardRoutes } from '@/hooks/useStaffInvitations';

const entityIcons: Record<EntityType, React.ReactNode> = {
  practice: <Building2 className="w-16 h-16 text-primary" />,
  pharmacy: <Pill className="w-16 h-16 text-primary" />,
  lab: <FlaskConical className="w-16 h-16 text-primary" />,
  imaging_center: <Scan className="w-16 h-16 text-primary" />,
};

const entityLabels: Record<EntityType, string> = {
  practice: 'Practice',
  pharmacy: 'Pharmacy',
  lab: 'Laboratory',
  imaging_center: 'Imaging Center',
};

const AcceptInvite = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<StaffInvitation | null>(null);
  const [entityName, setEntityName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { acceptInvitation, loading: accepting } = useAcceptStaffInvitation();

  // Check for legacy practice_invitations format
  const [isLegacyInvitation, setIsLegacyInvitation] = useState(false);
  const [legacyInvitation, setLegacyInvitation] = useState<any>(null);
  const [legacyPractice, setLegacyPractice] = useState<any>(null);

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      setLoading(true);
      setError(null);

      // First try the new staff_invitations table
      const staffInvite = await getInvitationByToken(token!);
      
      if (staffInvite) {
        // Check if invitation is valid
        if (staffInvite.status === 'accepted') {
          setError('This invitation has already been accepted');
          return;
        }

        if (staffInvite.status === 'declined' || staffInvite.status === 'expired') {
          setError('This invitation is no longer valid');
          return;
        }

        // Check expiration
        if (new Date(staffInvite.expires_at) < new Date()) {
          setError('This invitation has expired');
          await supabase
            .from('staff_invitations')
            .update({ status: 'expired' })
            .eq('id', staffInvite.id);
          return;
        }

        setInvitation(staffInvite);

        // Fetch entity name
        let name = '';
        if (staffInvite.entity_type === 'practice') {
          const { data } = await supabase.from('practices').select('name, verified').eq('id', staffInvite.entity_id).single();
          name = data?.name || 'Practice';
          setLegacyPractice(data);
        } else if (staffInvite.entity_type === 'pharmacy') {
          const { data } = await supabase.from('pharmacies').select('name').eq('id', staffInvite.entity_id).single();
          name = data?.name || 'Pharmacy';
        } else if (staffInvite.entity_type === 'lab') {
          const { data } = await supabase.from('lab_centers').select('name').eq('id', staffInvite.entity_id).single();
          name = data?.name || 'Laboratory';
        } else if (staffInvite.entity_type === 'imaging_center') {
          const { data } = await supabase.from('imaging_centers').select('name').eq('id', staffInvite.entity_id).single();
          name = data?.name || 'Imaging Center';
        }
        setEntityName(name);
        return;
      }

      // Fallback to legacy practice_invitations table
      const { data: legacyData, error: legacyError } = await supabase
        .from('practice_invitations' as any)
        .select('*')
        .eq('invite_token', token)
        .single();

      if (legacyError || !legacyData) {
        setError('Invalid or expired invitation link');
        return;
      }

      const legacy = legacyData as any;
      setIsLegacyInvitation(true);
      setLegacyInvitation(legacy);

      // Check legacy invitation validity
      if (legacy.status === 'accepted') {
        setError('This invitation has already been accepted');
        return;
      }

      if (legacy.status === 'declined' || legacy.status === 'expired') {
        setError('This invitation is no longer valid');
        return;
      }

      if (new Date(legacy.expires_at) < new Date()) {
        setError('This invitation has expired');
        await supabase
          .from('practice_invitations' as any)
          .update({ status: 'expired' })
          .eq('id', legacy.id);
        return;
      }

      // Fetch practice details
      const { data: practiceData } = await supabase
        .from('practices')
        .select('*')
        .eq('id', legacy.practice_id)
        .single();

      setLegacyPractice(practiceData);
      setEntityName(practiceData?.name || 'Practice');
    } catch (err: any) {
      console.error('Error fetching invitation:', err);
      setError('Failed to load invitation details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    // If user is not logged in, redirect to signup with invitation token
    if (!user) {
      toast.info('Please create an account or sign in to accept this invitation');
      // Store token in session storage for after signup
      sessionStorage.setItem('pending_staff_invite_token', token!);
      navigate(`/auth?invite=${token}`);
      return;
    }

    if (isLegacyInvitation && legacyInvitation) {
      await handleLegacyAccept();
      return;
    }

    if (!invitation) return;

    const result = await acceptInvitation(token!);
    
    if (result.success) {
      navigate(result.dashboardRoute || '/staff-dashboard');
    }
  };

  const handleLegacyAccept = async () => {
    try {
      // Create doctor profile if role is doctor
      if (legacyInvitation.role === 'doctor') {
        const { data: existingDoctor } = await supabase
          .from('doctors')
          .select('id, practice_id')
          .eq('user_id', user!.id)
          .single();

        if (existingDoctor) {
          await supabase
            .from('doctors')
            .update({ practice_id: legacyInvitation.practice_id })
            .eq('id', existingDoctor.id);
        } else {
          await supabase.from('doctors').insert({
            user_id: user!.id,
            practice_id: legacyInvitation.practice_id,
            specialty: 'General',
          });
        }

        await supabase.from('user_roles').upsert({
          user_id: user!.id,
          role: 'doctor',
        }, { onConflict: 'user_id,role' });
      }

      // Create staff record if role is staff
      if (legacyInvitation.role === 'staff') {
        await supabase.from('clinic_staff').insert({
          practice_id: legacyInvitation.practice_id,
          user_id: user!.id,
          staff_role: 'clinic_staff',
          status: 'active',
        });

        await supabase.from('user_roles').upsert({
          user_id: user!.id,
          role: 'clinic_staff',
        }, { onConflict: 'user_id,role' });
      }

      // Update invitation status
      await supabase
        .from('practice_invitations' as any)
        .update({
          status: 'accepted',
          invited_user_id: user!.id,
        })
        .eq('id', legacyInvitation.id);

      toast.success(`Successfully joined ${entityName}!`);

      if (legacyInvitation.role === 'doctor') {
        navigate('/doctor-dashboard');
      } else {
        navigate('/staff-dashboard');
      }
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      toast.error(err.message || 'Failed to accept invitation');
    }
  };

  const handleDeclineInvitation = async () => {
    try {
      if (isLegacyInvitation && legacyInvitation) {
        await supabase
          .from('practice_invitations' as any)
          .update({ status: 'declined' })
          .eq('id', legacyInvitation.id);
      } else if (invitation) {
        await supabase
          .from('staff_invitations')
          .update({ status: 'declined' })
          .eq('id', invitation.id);
      }

      toast.info('Invitation declined');
      navigate('/');
    } catch (err: any) {
      console.error('Error declining invitation:', err);
      toast.error('Failed to decline invitation');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading invitation...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <XCircle className="w-16 h-16 text-destructive" />
            </div>
            <CardTitle className="text-center">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayEntityType = invitation?.entity_type || 'practice';
  const displayRole = invitation?.role || legacyInvitation?.role || 'Staff';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {entityIcons[displayEntityType]}
          </div>
          <CardTitle className="text-center text-2xl">
            {entityLabels[displayEntityType]} Invitation
          </CardTitle>
          <CardDescription className="text-center">
            You've been invited to join as staff
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{entityLabels[displayEntityType]}:</span>
                <span className="font-medium">{entityName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Role:</span>
                <span className="font-medium capitalize">{displayRole.replace(/_/g, ' ')}</span>
              </div>
              {(invitation?.custom_message || legacyInvitation?.custom_message) && (
                <div className="pt-2 border-t">
                  <p className="text-sm italic text-muted-foreground">
                    "{invitation?.custom_message || legacyInvitation?.custom_message}"
                  </p>
                </div>
              )}
            </div>

            {legacyPractice?.verified && (
              <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 dark:bg-green-950 p-2 rounded">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Verified {entityLabels[displayEntityType]}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleAcceptInvitation}
              disabled={accepting}
              className="flex-1"
            >
              {accepting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
            <Button
              onClick={handleDeclineInvitation}
              variant="outline"
              disabled={accepting}
              className="flex-1"
            >
              Decline
            </Button>
          </div>

          {!user && (
            <p className="text-xs text-center text-muted-foreground">
              You'll be redirected to create an account or sign in
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;