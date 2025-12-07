import { Shield, Calendar, FileText, Star, Edit, Trash2, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { PatientInsurance } from '@/hooks/useInsurance';
import { format } from 'date-fns';

interface PatientInsuranceCardProps {
  insurance: PatientInsurance;
  onEdit?: (insurance: PatientInsurance) => void;
  onDelete?: (insurance: PatientInsurance) => void;
  showActions?: boolean;
  compact?: boolean;
}

export const PatientInsuranceCard = ({
  insurance,
  onEdit,
  onDelete,
  showActions = true,
  compact = false,
}: PatientInsuranceCardProps) => {
  const isExpired = insurance.valid_until && new Date(insurance.valid_until) < new Date();
  const isExpiringSoon = insurance.valid_until && 
    new Date(insurance.valid_until) > new Date() &&
    new Date(insurance.valid_until) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const getStatusBadge = () => {
    if (isExpired) return <Badge variant="destructive">Expired</Badge>;
    if (isExpiringSoon) return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Expiring Soon</Badge>;
    if (insurance.status === 'active') return <Badge variant="default" className="bg-green-600">Active</Badge>;
    return <Badge variant="secondary">{insurance.status}</Badge>;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
        <Avatar className="h-10 w-10">
          <AvatarImage src={insurance.provider?.logo_url || ''} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {insurance.provider?.provider_name?.substring(0, 2).toUpperCase() || 'IN'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{insurance.provider?.provider_name || 'Unknown Provider'}</p>
          {insurance.plan && (
            <p className="text-xs text-muted-foreground truncate">{insurance.plan.plan_name}</p>
          )}
        </div>
        {insurance.is_primary && (
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        )}
        {getStatusBadge()}
      </div>
    );
  }

  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarImage src={insurance.provider?.logo_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {insurance.provider?.provider_name?.substring(0, 2).toUpperCase() || 'IN'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">
                  {insurance.provider?.provider_name || 'Unknown Provider'}
                </h3>
                {insurance.is_primary && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    <Star className="h-3 w-3 mr-1 fill-yellow-500" />
                    Primary
                  </Badge>
                )}
              </div>
              {insurance.plan && (
                <p className="text-sm text-muted-foreground">{insurance.plan.plan_name}</p>
              )}
            </div>
          </div>
          {getStatusBadge()}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {insurance.member_id && (
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Member ID:</span>
              <span className="font-medium">{insurance.member_id}</span>
            </div>
          )}
          {insurance.valid_until && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Valid Until:</span>
              <span className="font-medium">{format(new Date(insurance.valid_until), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {insurance.file_url && (
          <div className="mt-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <a 
              href={insurance.file_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View Insurance Card
              <Download className="h-3 w-3" />
            </a>
          </div>
        )}

        {showActions && (
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit?.(insurance)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onDelete?.(insurance)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
