// File: src/components/referrals/ReferralCard.tsx

import { useEffect, useMemo, useState } from 'react';
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
  Pill,
  ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  isReferralValid,
  getReferralTargetLabel,
  getReferralPatientDisplayName,
  getEntityName,
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
  onBookAppointment?: (referral: Referral) => void;
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
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [receiverName, setReceiverName] = useState<string>('');

  const isValid = isReferralValid(referral);
  const StatusIcon = getStatusIcon(String(referral.status || ''));
  const ReferrerIcon = getEntityIcon(referral.referrer_type);
  const ReceiverIcon = getEntityIcon(referral.receiver_type);

  const priorityVariant = getReferralPriorityColor(referral.priority) as any;
  const statusVariant = getReferralStatusColor(String(referral.status || '')) as any;

  const scope = useMemo(() => {
    const rAny = referral as any;
    const s = (rAny.scope as string | null | undefined) || (referral.receiver_entity_id ? 'specific' : 'general');
    return (s === 'general' ? 'general' : 'specific') as 'general' | 'specific';
  }, [referral]);

  const patientName = useMemo(() => getReferralPatientDisplayName(referral), [referral]);
  const targetLabel = useMemo(() => getReferralTargetLabel(referral), [referral]);

  const status = String(referral.status || '');
  const isDeclined = ['rejected', 'cancelled', 'expired'].includes(status);
  const isFinished = ['completed'].includes(status);
  const isBookableState = ['sent', 'accepted', 'slots_available'].includes(status);

  const isSpecificDoctor =
    scope === 'specific' &&
    referral.receiver_type === 'doctor' &&
    !!referral.receiver_entity_id;

  const canPatientBookDoctor =
    role === 'patient' &&
    isSpecificDoctor &&
    isValid &&
    isBookableState &&
    !isDeclined &&
    !isFinished &&
    status !== 'booked' &&
    status !== 'in_progress';

  const canPatientChooseProvider =
    role === 'patient' &&
    scope === 'general' &&
    isValid &&
    ['sent', 'accepted'].includes(status) &&
    !isDeclined &&
    !isFinished;

  const showAcceptReject = role === 'receiver' && status === 'sent';
  const showPublishSlots = role === 'receiver' && status === 'accepted';

  // Keep slot booking for non-doctor workflows that explicitly publish slots
  const showBookSlot = role === 'patient' && status === 'slots_available' && isValid && !isSpecificDoctor;

  const showComplete = role === 'receiver' && status === 'booked';

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (scope !== 'specific') {
        if (mounted) setReceiverName('');
        return;
      }

      if (!referral.receiver_entity_id) {
        if (mounted) setReceiverName('');
        return;
      }

      try {
        const n = await getEntityName(referral.receiver_type, referral.receiver_entity_id);
        if (mounted) setReceiverName(n);
      } catch {
        if (mounted) setReceiverName('');
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [scope, referral.receiver_type, referral.receiver_entity_id]);

  const receiverDisplay = useMemo(() => {
    if (scope === 'general') return targetLabel;
    return receiverName || (referral.receiver_entity_id ? `${String(referral.receiver_entity_id).slice(0, 8)}…` : '—');
  }, [scope, targetLabel, receiverName, referral.receiver_entity_id]);

  const handlePatientBookDoctor = () => {
    if (!referral.receiver_entity_id) return;
    const qs = new URLSearchParams({ referralId: referral.id }).toString();
    navigate(`/book-appointment/${referral.receiver_entity_id}?${qs}`);
  };

  const handlePatientChooseProvider = () => {
    const qsBase = new URLSearchParams({ referralId: referral.id });
    const rAny = referral as any;

    if (referral.receiver_type === 'doctor') {
      const specialty = String(rAny.target_specialty_key || '').trim();
      if (specialty) qsBase.set('specialty', specialty);
      navigate(`/find-doctors?${qsBase.toString()}`);
      return;
    }

    if (referral.receiver_type === 'clinic') {
      navigate(`/find-practices?${qsBase.toString()}`);
      return;
    }

    if (referral.receiver_type === 'lab') {
      navigate(`/labs?${qsBase.toString()}`);
      return;
    }

    if (referral.receiver_type === 'imaging_center') {
      navigate(`/imaging-centers?${qsBase.toString()}`);
      return;
    }

    if (referral.receiver_type === 'pharmacy') {
      navigate(`/pharmacies?${qsBase.toString()}`);
      return;
    }

    navigate(`/patient-dashboard?${qsBase.toString()}`);
  };

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
              {status.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        <div className="mt-2">
          <p className="text-sm font-medium text-muted-foreground">{referral.referral_number}</p>
          <h3 className="font-semibold mt-1">
            {getReferralTypeLabel(referral.referral_type_enum || 'consultation')}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="capitalize">{scope}</span> referral • <span className="font-medium">{receiverDisplay}</span>
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Patient Info */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Patient:</span>
          <span>{patientName}</span>
        </div>

        <div className="text-sm">
          <span className="text-muted-foreground">Reason: </span>
          <span>{referral.reason || 'Not specified'}</span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(referral.valid_from), 'MMM d')} - {format(new Date(referral.valid_until), 'MMM d, yyyy')}
                  </span>
                  {!isValid && <AlertCircle className="h-4 w-4 text-destructive" />}
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

        {isExpanded && (
          <div className="pt-2 border-t space-y-3">
            {scope === 'general' && (
              <div className="text-sm">
                <span className="text-muted-foreground block mb-1">General Target:</span>
                <p className="bg-muted/50 p-2 rounded text-sm">{targetLabel}</p>
              </div>
            )}

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
                {referral.preferred_time_slot && <span className="ml-2">at {referral.preferred_time_slot}</span>}
              </div>
            )}

            {(referral as any)?.verification_code && (
              <div className="text-sm">
                <span className="text-muted-foreground">Verification Code: </span>
                <span className="font-mono">{(referral as any).verification_code}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
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
                <Button size="sm" onClick={() => onAccept?.(referral.id)}>
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

            {canPatientBookDoctor && (
              <Button size="sm" onClick={handlePatientBookDoctor}>
                <Calendar className="h-4 w-4 mr-1" />
                Book Appointment
              </Button>
            )}

            {canPatientChooseProvider && (
              <Button size="sm" variant="outline" onClick={handlePatientChooseProvider}>
                <ArrowUpRight className="h-4 w-4 mr-1" />
                Choose Provider
              </Button>
            )}

            {showBookSlot && (
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
