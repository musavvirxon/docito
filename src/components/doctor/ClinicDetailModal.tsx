import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { MapPin, Phone, Mail, Globe, Star, Users, Building2, Loader2 } from "lucide-react";
import { Clinic } from "@/hooks/useClinics";

interface ClinicDetailModalProps {
  clinic: Clinic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoinRequest?: () => void;
  requestStatus?: string;
  isSubmitting?: boolean;
}

export const ClinicDetailModal = ({ 
  clinic, 
  open, 
  onOpenChange,
  onJoinRequest,
  requestStatus = 'none',
  isSubmitting = false
}: ClinicDetailModalProps) => {
  if (!clinic) return null;

  const renderActionButton = () => {
    switch (requestStatus) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700">Request Pending</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-700">Request Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Request Rejected</Badge>;
      default:
        return (
          <Button onClick={onJoinRequest} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Request to Join
          </Button>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={clinic.logo_url || undefined} alt={clinic.name} />
              <AvatarFallback>
                <Building2 className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <DialogTitle className="text-2xl">{clinic.name}</DialogTitle>
                {clinic.verified && (
                  <Badge className="bg-blue-100 text-blue-700">Verified</Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {clinic.city}, {clinic.country}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {clinic.average_rating.toFixed(1)} ({clinic.num_reviews} reviews)
                </div>
              </div>
            </div>
            {renderActionButton()}
          </div>
        </DialogHeader>

        <Separator />

        <div className="space-y-6">
          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">About</h3>
            <DialogDescription className="text-base">
              {clinic.description || 'No description available.'}
            </DialogDescription>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="font-semibold mb-3">Contact Information</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{clinic.address || 'Address not provided'}</span>
              </div>
              {clinic.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${clinic.phone}`} className="hover:underline">
                    {clinic.phone}
                  </a>
                </div>
              )}
              {clinic.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${clinic.email}`} className="hover:underline">
                    {clinic.email}
                  </a>
                </div>
              )}
              {clinic.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={clinic.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Visit Website
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div>
            <h3 className="font-semibold mb-3">Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Total Appointments</span>
                </div>
                <p className="text-2xl font-bold">{clinic.appointment_count}</p>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Star className="h-4 w-4" />
                  <span className="text-sm">Reviews</span>
                </div>
                <p className="text-2xl font-bold">{clinic.num_reviews}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
