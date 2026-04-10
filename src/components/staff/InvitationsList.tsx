import { format, formatDistanceToNow } from "date-fns";
import { Clock, Mail, MoreHorizontal, Phone, RefreshCw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePracticeInvitations, PracticeInvitation } from "@/hooks/usePracticeInvitations";

interface InvitationsListProps {
  practiceId: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  accepted: "bg-green-500/10 text-green-600 border-green-500/20",
  expired: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  declined: "bg-red-500/10 text-red-600 border-red-500/20",
  awaitingSignup: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

const roleLabels: Record<string, string> = {
  receptionist: "Receptionist",
  nurse: "Nurse / Assistant",
  billing_manager: "Billing Manager",
  clinic_admin: "Clinic Admin",
};

export function InvitationsList({ practiceId }: InvitationsListProps) {
  const { t } = useTranslation('dashboard');
  const { invitations, loading, cancelInvitation, resendInvitation } = usePracticeInvitations(practiceId);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!invitations?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('staff.invitations.empty', 'No invitations sent yet. Use the "Invite Staff" button to send your first invitation.')}
      </div>
    );
  }

  const handleCancel = async (invitation: PracticeInvitation) => {
    await cancelInvitation(invitation.id);
  };

  const handleResend = async (invitation: PracticeInvitation) => {
    await resendInvitation(invitation.id);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('staff.invitations.recipient', 'Recipient')}</TableHead>
          <TableHead>{t('staff.invitations.role', 'Role')}</TableHead>
          <TableHead>{t('staff.invitations.status', 'Status')}</TableHead>
          <TableHead>{t('staff.invitations.sent', 'Sent')}</TableHead>
          <TableHead>{t('staff.invitations.expires', 'Expires')}</TableHead>
          <TableHead className="w-[70px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((invitation) => {
          const isExpired = new Date(invitation.expires_at) < new Date();
          const canResend = invitation.status === 'pending' || invitation.status === 'awaitingSignup' || isExpired;
          const canCancel = invitation.status === 'pending' || invitation.status === 'awaitingSignup';

          return (
            <TableRow key={invitation.id}>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {invitation.full_name && (
                    <span className="font-medium">{invitation.full_name}</span>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {invitation.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {invitation.email}
                      </span>
                    )}
                    {invitation.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {invitation.phone}
                      </span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {roleLabels[invitation.role] || invitation.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={statusColors[isExpired && (invitation.status === 'pending' || invitation.status === 'awaitingSignup') ? 'expired' : invitation.status]}
                >
                  {isExpired && (invitation.status === 'pending' || invitation.status === 'awaitingSignup') 
                    ? 'Expired' 
                    : invitation.status === 'awaitingSignup' 
                      ? 'Awaiting Signup'
                      : invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
              </TableCell>
              <TableCell className="text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canResend && (
                      <DropdownMenuItem onClick={() => handleResend(invitation)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('staff.invitations.resend', 'Resend Invitation')}
                      </DropdownMenuItem>
                    )}
                    {canCancel && (
                      <DropdownMenuItem
                        onClick={() => handleCancel(invitation)}
                        className="text-destructive"
                      >
                        <X className="h-4 w-4 mr-2" />
                        {t('staff.invitations.cancel', 'Cancel Invitation')}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
