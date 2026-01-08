import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar,
  ArrowRightLeft,
  User,
  FileText,
  ExternalLink,
  Clock,
  MapPin,
  Stethoscope,
  Lock,
} from 'lucide-react';
import { format } from 'date-fns';
import { HealthcareConversation, HealthcareParticipant } from '@/hooks/useHealthcareMessaging';
import RoleBadge from './RoleBadge';
import { useAuth } from '@/contexts/AuthContext';
import { getReferralTypeLabel } from '@/lib/api/referral-api';

interface ConversationContextPanelProps {
  conversation: HealthcareConversation;
  onViewAppointment?: (appointmentId: string) => void;
  onViewReferral?: (referralId: string) => void;
}

const ConversationContextPanel: React.FC<ConversationContextPanelProps> = ({
  conversation,
  onViewAppointment,
  onViewReferral,
}) => {
  const { user } = useAuth();
  const { context_type, context_data, participants, is_locked } = conversation;

  const otherParticipants = participants?.filter(p => p.user_id !== user?.id) || [];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Lock Status */}
        {is_locked && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
            <CardContent className="p-3 flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700 dark:text-amber-300">
                This conversation is read-only
              </span>
            </CardContent>
          </Card>
        )}

        {/* Context Details */}
        {context_type === 'visit' && context_data && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(context_data.appointment_date), 'MMM d, yyyy')} at{' '}
                  {context_data.start_time}
                </span>
              </div>
              {context_data.doctors?.profiles?.full_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Stethoscope className="h-4 w-4 text-muted-foreground" />
                  <span>Dr. {context_data.doctors.profiles.full_name}</span>
                </div>
              )}
              <Badge variant="outline" className="text-xs">
                {context_data.status}
              </Badge>
              {onViewAppointment && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => onViewAppointment(context_data.id)}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                  View Appointment
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {context_type === 'referral' && context_data && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-purple-500" />
                Referral Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Type: </span>
                <span>
                  {getReferralTypeLabel(
                    context_data.referral_type_enum || context_data.referral_type || 'consultation'
                  )}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Urgency: </span>
                <Badge
                  variant="outline"
                  className={
                    (context_data.priority || context_data.urgency) === 'stat'
                      ? 'border-red-500 text-red-500'
                      : (context_data.priority || context_data.urgency) === 'urgent'
                      ? 'border-amber-500 text-amber-500'
                      : ''
                  }
                >
                  {(context_data.priority || context_data.urgency || 'routine')}
                </Badge>
              </div>
              {context_data.reason && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Reason: </span>
                  <span>{context_data.reason}</span>
                </div>
              )}
              <Badge variant="outline" className="text-xs">
                {context_data.status}
              </Badge>
              {onViewReferral && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => onViewReferral(context_data.id)}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                  View Referral
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Participants */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Participants ({(participants?.length || 0)})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {otherParticipants.map((participant) => (
              <div key={participant.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={participant.profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {participant.profile?.full_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {participant.profile?.full_name || 'Unknown'}
                  </p>
                  {participant.profile?.role && (
                    <RoleBadge role={participant.profile.role} size="sm" />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <FileText className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
            {context_type === 'visit' && (
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Reschedule Visit
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

export default ConversationContextPanel;
