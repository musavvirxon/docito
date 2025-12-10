import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Video, 
  Clock, 
  Calendar, 
  User,
  ExternalLink,
  Copy,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { VideoConsultation } from '@/hooks/useVideoConsultation';
import { format, isPast, isWithinInterval, addMinutes } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface VideoConsultationCardProps {
  consultation: VideoConsultation;
  otherPartyName: string;
  otherPartyAvatar?: string;
  userRole: 'doctor' | 'patient';
  onJoin: (consultation: VideoConsultation) => void;
  onCancel?: (consultation: VideoConsultation) => void;
}

const VideoConsultationCard: React.FC<VideoConsultationCardProps> = ({
  consultation,
  otherPartyName,
  otherPartyAvatar,
  userRole,
  onJoin,
  onCancel,
}) => {
  const { toast } = useToast();

  const getStatusConfig = (status: VideoConsultation['status']) => {
    switch (status) {
      case 'scheduled':
        return { label: 'Scheduled', variant: 'secondary' as const, icon: Clock };
      case 'waiting':
        return { label: 'Waiting', variant: 'default' as const, icon: AlertCircle };
      case 'in_progress':
        return { label: 'In Progress', variant: 'default' as const, icon: Video };
      case 'completed':
        return { label: 'Completed', variant: 'outline' as const, icon: CheckCircle2 };
      case 'cancelled':
        return { label: 'Cancelled', variant: 'destructive' as const, icon: XCircle };
      case 'no_show':
        return { label: 'No Show', variant: 'destructive' as const, icon: XCircle };
      default:
        return { label: status, variant: 'secondary' as const, icon: Clock };
    }
  };

  const statusConfig = getStatusConfig(consultation.status);
  const StatusIcon = statusConfig.icon;

  const scheduledStart = new Date(consultation.scheduled_start);
  const scheduledEnd = new Date(consultation.scheduled_end);
  const now = new Date();

  // Allow joining 10 minutes before scheduled time
  const canJoinWindow = {
    start: addMinutes(scheduledStart, -10),
    end: scheduledEnd,
  };

  const canJoin = 
    (consultation.status === 'scheduled' || consultation.status === 'waiting' || consultation.status === 'in_progress') &&
    isWithinInterval(now, canJoinWindow);

  const isUpcoming = !isPast(scheduledStart) && consultation.status === 'scheduled';
  const isPastConsultation = consultation.status === 'completed' || consultation.status === 'cancelled';

  const copyLink = () => {
    navigator.clipboard.writeText(consultation.room_url);
    toast({
      title: 'Link copied',
      description: 'Video consultation link copied to clipboard',
    });
  };

  return (
    <Card className={`transition-all hover:shadow-md ${isPastConsultation ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherPartyAvatar} />
              <AvatarFallback>
                {otherPartyName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{otherPartyName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {userRole === 'doctor' ? 'Patient' : 'Doctor'}
              </p>
            </div>
          </div>
          <Badge variant={statusConfig.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Time Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {format(scheduledStart, 'MMM d, yyyy')}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {format(scheduledStart, 'h:mm a')} - {format(scheduledEnd, 'h:mm a')}
          </div>
        </div>

        {/* Duration (for completed) */}
        {consultation.duration_minutes && (
          <p className="text-sm text-muted-foreground">
            Duration: {consultation.duration_minutes} minutes
          </p>
        )}

        {/* Notes */}
        {consultation.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {consultation.notes}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {canJoin && (
            <Button onClick={() => onJoin(consultation)} className="gap-2 flex-1">
              <Video className="h-4 w-4" />
              {consultation.status === 'in_progress' ? 'Rejoin' : 'Join Now'}
            </Button>
          )}
          
          {isUpcoming && !canJoin && (
            <Button variant="outline" onClick={copyLink} className="gap-2 flex-1">
              <Copy className="h-4 w-4" />
              Copy Link
            </Button>
          )}

          {isUpcoming && onCancel && (
            <Button 
              variant="outline" 
              onClick={() => onCancel(consultation)}
              className="text-destructive hover:text-destructive"
            >
              Cancel
            </Button>
          )}

          {consultation.status === 'waiting' && (
            <Badge variant="outline" className="gap-1 px-3 py-2">
              <User className="h-3 w-3" />
              {userRole === 'doctor' 
                ? consultation.patient_joined_at ? 'Patient waiting' : 'Waiting for patient'
                : consultation.doctor_joined_at ? 'Doctor waiting' : 'Waiting for doctor'
              }
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoConsultationCard;
