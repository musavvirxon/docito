import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getBookingPath } from '@/lib/booking';

interface BookingModalProps {
  doctor: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
}

export function BookingModal({ doctor, open, onOpenChange, isLoggedIn, onLoginRequired }: BookingModalProps) {
  if (!doctor) return null;

  const handleBook = () => {
    if (!isLoggedIn) {
      onLoginRequired();
      return;
    }
    // Navigate to full booking flow
    window.location.href = getBookingPath(doctor.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Book Appointment with {doctor.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You're about to book an appointment with <strong className="text-foreground">{doctor.name}</strong>
            {doctor.specialty ? ` (${doctor.specialty})` : ''}.
          </p>
          {doctor.consultationFee != null && (
            <p className="text-sm text-muted-foreground">
              Fee: <span className="font-medium text-foreground">${doctor.consultationFee}</span>
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleBook} className="flex-1">
              {isLoggedIn ? 'Continue Booking' : 'Sign In to Book'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
