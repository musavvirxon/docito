import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CalendarPlus, User, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";

interface ManualBookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  practiceId?: string;
  onSuccess?: () => void;
  prefilledDate?: Date;
  prefilledTime?: string;
}

const ManualBookAppointmentModal = ({
  isOpen,
  onClose,
  doctorId,
  practiceId,
  onSuccess,
  prefilledDate,
  prefilledTime
}: ManualBookAppointmentModalProps) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(prefilledDate || new Date());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Patient selection - only existing patients from doctor_patients
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [loadingPatients, setLoadingPatients] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchDoctorPatients();
      if (prefilledDate) setSelectedDate(prefilledDate);
    }
  }, [isOpen, prefilledDate, doctorId]);

  const fetchDoctorPatients = async () => {
    try {
      setLoadingPatients(true);
      // Fetch patients from doctor_patients table (doctor's own patient list)
      const { data, error } = await supabase
        .from('doctor_patients')
        .select('id, full_name, phone, email, date_of_birth')
        .eq('doctor_id', doctorId)
        .eq('status', 'active')
        .order('full_name');
      
      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      console.error('Error fetching doctor patients:', error);
      toast.error("Failed to load patients");
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleAddNewPatient = () => {
    onClose();
    // Navigate to doctor dashboard patients section
    navigate('/doctor-dashboard?tab=patients&action=add');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !prefilledTime) {
      toast.error("Please select a valid time slot");
      return;
    }
    if (!selectedPatientId) {
      toast.error("Please select a patient");
      return;
    }
    
    console.log('🚀 Starting appointment booking...');
    setLoading(true);

    try {
      // Get selected patient info
      const selectedPatient = patients.find(p => p.id === selectedPatientId);
      if (!selectedPatient) {
        toast.error("Patient not found");
        return;
      }

      // Calculate end time (default 30 min slot)
      const startTime = prefilledTime;
      const [hours, minutes] = startTime.split(':').map(Number);
      const endDate = new Date();
      endDate.setHours(hours, minutes + 30, 0, 0);
      const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

      // Create appointment using doctor_patient id in notes (since patient_id expects auth user id)
      // For doctor_patients who are not registered users, we'll store reference in notes
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          doctor_id: doctorId,
          patient_id: null, // doctor_patients are not auth users
          practice_id: practiceId || null,
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: startTime,
          end_time: endTime,
         notes: notes || null,
          status: 'confirmed'
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;
      
      console.log('✅ Appointment created:', appointment);

      // Notify doctor (current user)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const appointmentDate = new Date(selectedDate).toLocaleDateString('en-US', { 
          month: 'short', day: 'numeric', year: 'numeric' 
        });

        await supabase.from('real_time_notifications').insert([{
          recipient_user_id: currentUser.id,
          notification_type: 'appointment_created',
          title: 'Appointment Booked',
          message: `Appointment with ${selectedPatient.full_name} scheduled for ${appointmentDate} at ${startTime}`,
          data: { appointment_id: appointment.id, appointment_date: selectedDate.toISOString() }
        }]);
      }

      toast.success(`Appointment booked for ${selectedPatient.full_name}`);

      // Refresh calendar
      console.log('📞 Calling onSuccess callback...');
      await onSuccess?.();
      console.log('✅ Success callback completed');
      
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('❌ Booking error:', error);
      toast.error(error.message || "Failed to book appointment");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedDate(new Date());
    setNotes("");
    setSelectedPatientId("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5" />
            Book Appointment
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <Label className="text-base font-medium">Select Patient</Label>
            </div>
            
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingPatients ? "Loading patients..." : "Choose a patient from your list"} />
              </SelectTrigger>
              <SelectContent>
                {patients.length === 0 ? (
                  <div className="p-3 text-center text-sm text-muted-foreground">
                    No patients found. Add patients first.
                  </div>
                ) : (
                  patients.map(patient => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.full_name} {patient.phone && `(${patient.phone})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {/* Add New Patient Button */}
            <Button 
              type="button" 
              variant="link" 
              className="p-0 h-auto text-primary"
              onClick={handleAddNewPatient}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add New Patient
            </Button>
          </div>

          <Separator />

          {/* Selected Slot Info */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h3 className="font-medium text-sm">Selected Time Slot</h3>
            <p className="text-sm text-muted-foreground">
              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')} at {prefilledTime || 'Not selected'}
            </p>
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="notes">Appointment Notes</Label>
            <Textarea 
              id="notes" 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              placeholder="Reason for visit, symptoms, special instructions, etc." 
              className="min-h-[100px]" 
            />
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !selectedPatientId}>
              {loading ? "Booking..." : "Book Appointment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ManualBookAppointmentModal;
