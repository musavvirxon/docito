import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Clock, Send, XCircle, Loader2 } from 'lucide-react';
import { usePracticeInvitations } from '@/hooks/usePracticeInvitations';
import { formatDistance } from 'date-fns';

interface PendingInvitationsSectionProps {
  practiceId: string;
}

const PendingInvitationsSection = ({ practiceId }: PendingInvitationsSectionProps) => {
  const { invitations, loading, resendInvitation, cancelInvitation } = usePracticeInvitations(practiceId);

  const pendingInvitations = invitations.filter(
    (inv) => inv.status === 'pending' || inv.status === 'awaitingSignup'
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Invitations ({pendingInvitations.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {pendingInvitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No pending invitations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">
                      {invitation.full_name || invitation.email}
                    </h4>
                    <Badge
                      variant={invitation.invite_type === 'existingUser' ? 'default' : 'secondary'}
                    >
                      {invitation.invite_type === 'existingUser' ? 'Existing User' : 'New User'}
                    </Badge>
                    <Badge variant="outline">{invitation.role}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {invitation.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {invitation.email}
                      </div>
                    )}
                    {invitation.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {invitation.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Sent {formatDistance(new Date(invitation.created_at), new Date(), { addSuffix: true })}
                    </div>
                  </div>

                  {invitation.custom_message && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      "{invitation.custom_message}"
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resendInvitation(invitation.id)}
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Resend
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => cancelInvitation(invitation.id)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingInvitationsSection;