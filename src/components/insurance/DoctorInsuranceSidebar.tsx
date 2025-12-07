import { Shield, Phone, Calendar, CreditCard, FileText, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { usePatientInsurance } from '@/hooks/useInsurance';
import { format, isPast, differenceInDays } from 'date-fns';

interface DoctorInsuranceSidebarProps {
  patientId: string;
  doctorAcceptsInsurance?: (providerId: string, planId?: string) => boolean;
  onVerifyEligibility?: () => void;
  onViewFull?: () => void;
}

export const DoctorInsuranceSidebar = ({
  patientId,
  doctorAcceptsInsurance,
  onVerifyEligibility,
  onViewFull,
}: DoctorInsuranceSidebarProps) => {
  const { data: insurances = [], isLoading } = usePatientInsurance(patientId);

  const primaryInsurance = insurances.find(i => i.is_primary);

  const getExpirationStatus = (validUntil: string | null) => {
    if (!validUntil) return null;
    const expirationDate = new Date(validUntil);
    if (isPast(expirationDate)) {
      return { status: 'expired', label: 'Expired', icon: XCircle, color: 'text-destructive' };
    }
    const daysUntilExpiry = differenceInDays(expirationDate, new Date());
    if (daysUntilExpiry <= 30) {
      return { status: 'expiring', label: `Expires in ${daysUntilExpiry} days`, icon: AlertTriangle, color: 'text-yellow-600' };
    }
    return { status: 'active', label: 'Active', icon: CheckCircle, color: 'text-green-600' };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Loading insurance...</p>
        </CardContent>
      </Card>
    );
  }

  if (!primaryInsurance) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Patient Insurance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No insurance on file</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const expStatus = getExpirationStatus(primaryInsurance.valid_until);
  const isAccepted = doctorAcceptsInsurance
    ? doctorAcceptsInsurance(primaryInsurance.provider_id, primaryInsurance.plan_id || undefined)
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Patient Insurance
          </span>
          {expStatus && (
            <Badge 
              variant={expStatus.status === 'active' ? 'default' : 'outline'}
              className={expStatus.status === 'expired' ? 'bg-destructive' : expStatus.status === 'expiring' ? 'text-yellow-600 border-yellow-600' : 'bg-green-600'}
            >
              <expStatus.icon className="h-3 w-3 mr-1" />
              {expStatus.label}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider Info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={primaryInsurance.provider?.logo_url || ''} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {primaryInsurance.provider?.provider_name?.substring(0, 2).toUpperCase() || 'IN'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {primaryInsurance.provider?.provider_name || 'Unknown Provider'}
            </p>
            {primaryInsurance.plan && (
              <p className="text-xs text-muted-foreground truncate">{primaryInsurance.plan.plan_name}</p>
            )}
          </div>
        </div>

        {/* Acceptance Status */}
        {isAccepted !== null && (
          <div className={`flex items-center gap-2 p-2 rounded-md ${isAccepted ? 'bg-green-50' : 'bg-red-50'}`}>
            {isAccepted ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">You accept this insurance</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">You don't accept this insurance</span>
              </>
            )}
          </div>
        )}

        <Separator />

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Member ID</span>
            <span className="font-medium">{primaryInsurance.member_id || 'N/A'}</span>
          </div>
          {primaryInsurance.group_number && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Group #</span>
              <span className="font-medium">{primaryInsurance.group_number}</span>
            </div>
          )}
          {primaryInsurance.valid_until && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valid Until</span>
              <span className="font-medium">{format(new Date(primaryInsurance.valid_until), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {/* Coverage Summary */}
        {(primaryInsurance.co_pay || primaryInsurance.deductible) && (
          <>
            <Separator />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-xs uppercase text-muted-foreground">Coverage</p>
              {primaryInsurance.co_pay && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Co-pay</span>
                  <span className="font-medium">${primaryInsurance.co_pay}</span>
                </div>
              )}
              {primaryInsurance.deductible && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deductible</span>
                  <span className="font-medium">${primaryInsurance.deductible}</span>
                </div>
              )}
              {primaryInsurance.annual_limit && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Annual Limit</span>
                  <span className="font-medium">${primaryInsurance.annual_limit}</span>
                </div>
              )}
              {primaryInsurance.covers_emergency !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Emergency</span>
                  <span className="font-medium">
                    {primaryInsurance.covers_emergency ? 'Covered' : 'Not Covered'}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Insurance Card Preview */}
        {(primaryInsurance.card_front_url || primaryInsurance.file_url) && (
          <>
            <Separator />
            <div>
              <p className="font-medium text-xs uppercase text-muted-foreground mb-2">Insurance Card</p>
              <a 
                href={primaryInsurance.card_front_url || primaryInsurance.file_url || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <FileText className="h-4 w-4" />
                View Card
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          {onVerifyEligibility && (
            <Button variant="outline" size="sm" className="w-full" onClick={onVerifyEligibility}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Verify Eligibility
            </Button>
          )}
          {onViewFull && (
            <Button variant="ghost" size="sm" className="w-full" onClick={onViewFull}>
              See Full Insurance Details
            </Button>
          )}
        </div>

        {/* Last Updated */}
        <p className="text-xs text-muted-foreground text-center">
          Last updated: {format(new Date(primaryInsurance.created_at), 'MMM d, yyyy')}
        </p>
      </CardContent>
    </Card>
  );
};
