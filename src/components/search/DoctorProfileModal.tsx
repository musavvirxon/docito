import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Video, Shield } from 'lucide-react';

interface DoctorProfileModalProps {
  doctor: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookAppointment: () => void;
  isLoggedIn: boolean;
}

export function DoctorProfileModal({ doctor, open, onOpenChange, onBookAppointment, isLoggedIn }: DoctorProfileModalProps) {
  if (!doctor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">{doctor.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {doctor.specialty && (
            <Badge variant="secondary">{doctor.specialty}</Badge>
          )}
          {doctor.rating && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {doctor.rating} ({doctor.reviewCount || 0} reviews)
            </div>
          )}
          {doctor.location && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {doctor.location}
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            {doctor.videoConsultation && (
              <Badge variant="outline"><Video className="h-3 w-3 mr-1" />Video</Badge>
            )}
            {doctor.acceptsInsurance && (
              <Badge variant="outline"><Shield className="h-3 w-3 mr-1" />Insurance</Badge>
            )}
          </div>
          {doctor.consultationFee != null && (
            <p className="text-sm text-muted-foreground">
              Consultation fee: <span className="font-medium text-foreground">${doctor.consultationFee}</span>
            </p>
          )}
          <Button onClick={onBookAppointment} className="w-full">
            Book Appointment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
