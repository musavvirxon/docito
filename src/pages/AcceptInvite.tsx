import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const AcceptInvite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [practice, setPractice] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch invitation details
      const { data: inviteData, error: inviteError } = await supabase
        .from('practice_invitations' as any)
        .select('*')
        .eq('invite_token', token)
        .single();

      if (inviteError || !inviteData) {
        setError('Invalid or expired invitation link');
        return;
      }

      const invitation = inviteData as any;

      // Check if invitation is still valid
      if (invitation.status === 'accepted') {
        setError('This invitation has already been accepted');
        return;
      }

      if (invitation.status === 'declined' || invitation.status === 'expired') {
        setError('This invitation is no longer valid');
        return;
      }

      // Check expiration
      const expiresAt = new Date(invitation.expires_at);
      if (expiresAt < new Date()) {
        setError('This invitation has expired');
        // Update invitation status
        await supabase
          .from('practice_invitations' as any)
          .update({ status: 'expired' })
          .eq('id', invitation.id);
        return;
      }

      // Fetch practice details
      const { data: practiceData } = await supabase
        .from('practices')
        .select('*')
        .eq('id', invitation.practice_id)
        .single();

      setInvitation(inviteData);
      setPractice(practiceData);
    } catch (err: any) {
      console.error('Error fetching invitation:', err);
      setError('Failed to load invitation details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!invitation) return;

    // If user is not logged in, redirect to signup with invitation token
    if (!user) {
      toast.info('Please create an account or sign in to accept this invitation');
      navigate(`/sign-up?invitation=${token}`);
      return;
    }

    try {
      setAccepting(true);

      // Create doctor profile if role is doctor
      if (invitation.role === 'doctor') {
        // Check if user already has a doctor profile
        const { data: existingDoctor } = await supabase
          .from('doctors')
          .select('id, practice_id')
          .eq('user_id', user.id)
          .single();

        if (existingDoctor) {
          // Update existing doctor profile with new practice
          const { error: updateError } = await supabase
            .from('doctors')
            .update({ practice_id: invitation.practice_id })
            .eq('id', existingDoctor.id);

          if (updateError) throw updateError;
        } else {
          // Create new doctor profile
          const { error: doctorError } = await supabase
            .from('doctors')
            .insert({
              user_id: user.id,
              practice_id: invitation.practice_id,
              specialty: 'General',
            });

          if (doctorError) throw doctorError;
        }

        // Add doctor role
        await supabase.from('user_roles').insert({
          user_id: user.id,
          role: 'doctor',
        });
      }

      // Create staff record if role is staff
      if (invitation.role === 'staff') {
        const { error: staffError } = await supabase
          .from('practice_staff' as any)
          .insert({
            practice_id: invitation.practice_id,
            user_id: user.id,
            full_name: invitation.full_name || 'Staff Member',
            email: invitation.email,
            phone: invitation.phone,
            role: 'staff',
            status: 'active',
          });

        if (staffError) throw staffError;
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('practice_invitations' as any)
        .update({ 
          status: 'accepted',
          invited_user_id: user.id,
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      toast.success(`Successfully joined ${practice?.name || 'the practice'}!`);

      // Redirect based on role
      if (invitation.role === 'doctor') {
        navigate('/doctor-dashboard');
      } else {
        navigate('/admin-dashboard');
      }
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      toast.error(err.message || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineInvitation = async () => {
    if (!invitation) return;

    try {
      await supabase
        .from('practice_invitations' as any)
        .update({ status: 'declined' })
        .eq('id', invitation.id);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Building2 className="w-16 h-16 text-primary" />
          </div>
          <CardTitle className="text-center text-2xl">Practice Invitation</CardTitle>
          <CardDescription className="text-center">
            You've been invited to join a practice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Practice:</span>
                <span className="font-medium">{practice?.name || 'Practice'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Role:</span>
                <span className="font-medium capitalize">{invitation?.role}</span>
              </div>
              {invitation?.custom_message && (
                <div className="pt-2 border-t">
                  <p className="text-sm italic text-muted-foreground">
                    "{invitation.custom_message}"
                  </p>
                </div>
              )}
            </div>

            {practice?.description && (
              <div>
                <h4 className="text-sm font-medium mb-2">About the Practice</h4>
                <p className="text-sm text-muted-foreground">{practice.description}</p>
              </div>
            )}

            {practice && (
              <div className="text-sm space-y-1">
                {practice.city && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span>{practice.city}, {practice.country}</span>
                  </div>
                )}
                {practice.verified && (
                  <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 dark:bg-green-950 p-2 rounded">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Verified Practice</span>
                  </div>
                )}
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
