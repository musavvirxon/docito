import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Clock, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SetAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  practiceId?: string;
  onSuccess?: () => void;
}

const SetAvailabilityModal = ({ isOpen, onClose, doctorId, practiceId, onSuccess }: SetAvailabilityModalProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [clinicHours, setClinicHours] = useState<any>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  useEffect(() => {
    if (isOpen && practiceId) {
      fetchClinicHours();
    }
  }, [isOpen, practiceId]);

  useEffect(() => {
    // Check if selected times are outside clinic hours
    if (startTime && endTime && clinicHours && selectedDate) {
      const dayOfWeek = format(selectedDate, 'EEEE').toLowerCase();
      const clinicDayHours = clinicHours[dayOfWeek];
      
      if (!clinicDayHours || !clinicDayHours.open) {
        setShowWarning(true);
        setWarningMessage(`The clinic is closed on ${format(selectedDate, 'EEEE')}s. Your availability will extend beyond clinic hours.`);
      } else if (startTime < clinicDayHours.start || endTime > clinicDayHours.end) {
        setShowWarning(true);
        setWarningMessage(`Your selected hours (${startTime} - ${endTime}) are outside the clinic's operating hours (${clinicDayHours.start} - ${clinicDayHours.end}). This will extend your schedule beyond clinic hours.`);
      } else {
        setShowWarning(false);
        setWarningMessage("");
      }
    }
  }, [startTime, endTime, clinicHours, selectedDate]);

  const fetchClinicHours = async () => {
    try {
      const { data, error } = await supabase
        .from('practices')
        .select('operating_hours')
        .eq('id', practiceId)
        .single();
      
      if (error) throw error;
      setClinicHours(data?.operating_hours || null);
    } catch (error) {
      console.error('Error fetching clinic hours:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !startTime || !endTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (startTime >= endTime) {
      toast.error("End time must be after start time");
      return;
    }

    setLoading(true);

    try {
      // Insert availability override
      const { error } = await supabase
        .from('availability_overrides')
        .insert({
          doctor_id: doctorId,
          override_date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: startTime,
          end_time: endTime,
          is_available: true,
          notes: notes || null
        });

      if (error) throw error;

      // If extending beyond clinic hours, log for reference
      if (showWarning) {
        console.log('Extended availability set beyond clinic hours');
      }

      toast.success("Availability set successfully");
      onSuccess?.();
      onClose();
      
      // Reset form
      setSelectedDate(new Date());
      setStartTime("");
      setEndTime("");
      setNotes("");
      setShowWarning(false);
    } catch (error: any) {
      console.error('Error setting availability:', error);
      toast.error(error.message || "Failed to set availability");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Set Custom Availability
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                disabled={(date) => date < new Date()}
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">
                  Override your regular schedule for this specific date
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Available From</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">Available To</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              {showWarning && (
                <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    {warningMessage}
                    <p className="mt-2 font-medium">Continue to extend your schedule?</p>
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Extended hours for special clinic"
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Setting..." : showWarning ? "Confirm & Extend Schedule" : "Set Availability"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SetAvailabilityModal;
