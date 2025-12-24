import { useState } from 'react';
import { format } from 'date-fns';
import { 
  ArrowRight, 
  Calendar, 
  Clock, 
  FileText, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Send,
  User,
  Building2,
  TestTube,
  Scan,
  Pill
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Referral, ReferralEntityType } from '@/hooks/useReferrals';
import { 
  getReferralPriorityColor, 
  getReferralStatusColor, 
  getReferralTypeLabel,
  getEntityTypeLabel,
  isReferralValid
} from '@/lib/api/referral-api';

interface ReferralCardProps {
  referral: Referral;
  role: 'referrer' | 'receiver' | 'patient';
  onAccept?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  onViewDetails?: (referral: Referral) => void;
  onBookSlot?: (referral: Referral) => void;
  onPublishSlots?: (referral: Referral) => void;
  onComplete?: (id: string) => void;
}

const getEntityIcon = (type: ReferralEntityType) => {
  switch (type) {
    case 'doctor':
      return User;
    case 'clinic':
      return Building2;
    case 'lab':
      return TestTube;
    case 'imaging_center':
      return Scan;
    case 'pharmacy':
      return Pill;
    default:
      return Building2;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return CheckCircle;
    case 'rejected':
    case 'cancelled':
    case 'expired':
      return XCircle;
    case 'sent':
      return Send;
    default:
      return Clock;
  }
};

export const ReferralCard = ({
  referral,
  role,
  onAccept,
  onReject,
  onViewDetails,
  onBookSlot,
  onPublishSlots,
  onComplete
}: ReferralCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isValid = isReferralValid(referral);
  const StatusIcon = getStatusIcon(referral.status);
  const ReferrerIcon = getEntityIcon(referral.referrer_type);
  const ReceiverIcon = getEntityIcon(referral.receiver_type);

  const priorityVariant = getReferralPriorityColor(referral.priority) as any;
  const statusVariant = getReferralStatusColor(referral.status) as any;

  const showAcceptReject = role === 'receiver' && referral.status === 'sent';
  const showPublishSlots = role === 'receiver' && referral.status === 'accepted';
  const showBookSlot = role === 'patient' && referral.status === 'slots_available';
  const showComplete = role === 'receiver' && referral.status === 'booked';

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <ReferrerIcon className="h-4 w-4" />
              <span>{getEntityTypeLabel(referral.referrer_type)}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <ReceiverIcon className="h-4 w-4" />
              <span>{getEntityTypeLabel(referral.receiver_type)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {referral.priority !== 'routine' && (
              <Badge variant={priorityVariant} className="uppercase text-xs">
                {referral.priority}
              </Badge>
            )}
            <Badge variant={statusVariant} className="capitalize">
              <StatusIcon className="h-3 w-3 mr-1" />
              {referral.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
        
        <div className="mt-2">
          <p className="text-sm font-medium text-muted-foreground">
            {referral.referral_number}
          </p>
          <h3 className="font-semibold mt-1">
            {getReferralTypeLabel(referral.referral_type_enum || 'consultation')}
          </h3>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Patient Info */}
        {referral.patient && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Patient:</span>
            <span>{referral.patient.full_name}</span>
          </div>
        )}

        {/* Reason */}
        <div className="text-sm">
          <span className="text-muted-foreground">Reason: </span>
          <span>{referral.reason || 'Not specified'}</span>
        </div>

        {/* Validity Window */}
        <div className="flex items-center gap-4 text-sm">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(referral.valid_from), 'MMM d')} - {format(new Date(referral.valid_until), 'MMM d, yyyy')}
                  </span>
                  {!isValid && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isValid ? 'Referral is valid' : 'Referral has expired'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{referral.estimated_duration_minutes || 30} min</span>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="pt-2 border-t space-y-3">
            {referral.clinical_notes && (
              <div className="text-sm">
                <span className="text-muted-foreground block mb-1">Clinical Notes:</span>
                <p className="bg-muted/50 p-2 rounded text-sm">{referral.clinical_notes}</p>
              </div>
            )}
            
            {referral.diagnosis_codes && referral.diagnosis_codes.length > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground block mb-1">Diagnosis Codes:</span>
                <div className="flex flex-wrap gap-1">
                  {referral.diagnosis_codes.map((code, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {referral.preferred_date && (
              <div className="text-sm">
                <span className="text-muted-foreground">Preferred Date: </span>
                <span>{format(new Date(referral.preferred_date), 'MMMM d, yyyy')}</span>
                {referral.preferred_time_slot && (
                  <span className="ml-2">at {referral.preferred_time_slot}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <FileText className="h-4 w-4 mr-1" />
            {isExpanded ? 'Less Details' : 'More Details'}
          </Button>

          <div className="flex items-center gap-2">
            {showAcceptReject && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReject?.(referral.id, '')}
                  className="text-destructive hover:text-destructive"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => onAccept?.(referral.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Accept
                </Button>
              </>
            )}

            {showPublishSlots && (
              <Button size="sm" onClick={() => onPublishSlots?.(referral)}>
                <Calendar className="h-4 w-4 mr-1" />
                Publish Slots
              </Button>
            )}

            {showBookSlot && isValid && (
              <Button size="sm" onClick={() => onBookSlot?.(referral)}>
                <Calendar className="h-4 w-4 mr-1" />
                Book Appointment
              </Button>
            )}

            {showComplete && (
              <Button size="sm" onClick={() => onComplete?.(referral.id)}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}

            {onViewDetails && (
              <Button variant="outline" size="sm" onClick={() => onViewDetails(referral)}>
                View Details
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
