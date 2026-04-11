import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Clock, Send, XCircle, Loader2, Copy, Check } from 'lucide-react';
import { usePracticeInvitations } from '@/hooks/usePracticeInvitations';
import { formatDistance } from 'date-fns';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface PendingInvitationsSectionProps {
  practiceId: string;
}

const PendingInvitationsSection = ({ practiceId }: PendingInvitationsSectionProps) => {
  const { t } = useTranslation('dashboard');
  const { invitations, loading, resendInvitation, cancelInvitation } = usePracticeInvitations(practiceId);
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const pendingInvitations = invitations.filter(
    (inv) => inv.status === 'pending' || inv.status === 'awaitingSignup'
  );

  const copyInviteLink = async (token: string, invitationId: string) => {
    const inviteLink = `${window.location.origin}/accept-invite/${token}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedId(invitationId);
      toast({
        title: t("pendingInvitations.linkCopied"),
        description: t("pendingInvitations.linkCopiedDesc"),
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: t("pendingInvitations.copyFailed"),
        description: t("pendingInvitations.copyFailed"),
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("pendingInvitations.title")}</CardTitle>
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
        <CardTitle>{t("pendingInvitations.title")} ({pendingInvitations.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {pendingInvitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t("pendingInvitations.noPending")}</p>
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
                      {invitation.invite_type === 'existingUser' ? t("pendingInvitations.existingUser") : t("pendingInvitations.newUser")}
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
                      {t("pendingInvitations.sent")} {formatDistance(new Date(invitation.created_at), new Date(), { addSuffix: true })}
                    </div>
                  </div>

                  {invitation.custom_message && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      "{invitation.custom_message}"
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  {invitation.invite_token && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyInviteLink(invitation.invite_token!, invitation.id)}
                    >
                      {copiedId === invitation.id ? (
                        <Check className="w-4 h-4 mr-1" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      {copiedId === invitation.id ? t("pendingInvitations.copied") : t("pendingInvitations.copyLink")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resendInvitation(invitation.id)}
                  >
                    <Send className="w-4 h-4 mr-1" />
                    {t("pendingInvitations.resend")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => cancelInvitation(invitation.id)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    {t("pendingInvitations.cancelInvite")}
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
