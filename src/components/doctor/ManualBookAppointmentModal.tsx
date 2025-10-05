import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CalendarPlus, User, Phone, Mail } from "lucide-react";
import { Separator } from "@/components/ui/separator";
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(prefilledDate || new Date());
  const [startTime, setStartTime] = useState(prefilledTime || "");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Patient selection
  const [useExisting, setUseExisting] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");

  // New patient info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  useEffect(() => {
    if (isOpen) {
      fetchPatients();
      if (prefilledDate) setSelectedDate(prefilledDate);
      if (prefilledTime) setStartTime(prefilledTime);
    }
  }, [isOpen, prefilledDate, prefilledTime]);
  const fetchPatients = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('user_id, full_name, email, phone').eq('role', 'patient').order('full_name');
      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      console.error('Error fetching patients:', error);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !startTime || !endTime) {
      toast.error("Please fill in date and time");
      return;
    }
    if (startTime >= endTime) {
      toast.error("End time must be after start time");
      return;
    }
    if (useExisting && !selectedPatientId) {
      toast.error("Please select a patient");
      return;
    }
    if (!useExisting && (!firstName || !lastName || !phone)) {
      toast.error("Please fill in patient details");
      return;
    }
    setLoading(true);
    try {
      let patientId = selectedPatientId;

      // If booking for new patient, create a guest profile first
      if (!useExisting) {
        // Create a guest patient profile WITHOUT switching auth sessions
        // This creates a profile entry that can be claimed later
        const guestEmail = email || `guest_${Date.now()}@manual.booking`;
        const tempUserId = crypto.randomUUID();

        // Insert directly into profiles table as a guest patient
        // No auth.signUp() to avoid session switching
        const {
          data: profileData,
          error: profileError
        } = await supabase.from('profiles').insert({
          user_id: tempUserId,
          full_name: `${firstName} ${lastName}`,
          email: guestEmail,
          phone: phone,
          role: 'patient'
        }).select().single();
        if (profileError) throw profileError;
        if (!profileData) throw new Error("Failed to create guest patient profile");
        patientId = profileData.user_id;
      }

      // Validate slot availability
      const {
        data: conflicts
      } = await supabase.from('appointments').select('id').eq('doctor_id', doctorId).eq('appointment_date', format(selectedDate, 'yyyy-MM-dd')).neq('status', 'canceled').or(`and(start_time.lte.${startTime},end_time.gt.${startTime}),and(start_time.lt.${endTime},end_time.gte.${endTime}),and(start_time.gte.${startTime},end_time.lte.${endTime})`);
      if (conflicts && conflicts.length > 0) {
        toast.error("This time slot conflicts with an existing appointment");
        return;
      }
      const {
        error
      } = await supabase.from('appointments').insert({
        doctor_id: doctorId,
        patient_id: patientId,
        practice_id: practiceId || null,
        appointment_date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime,
        notes: useExisting ? notes : `${notes}`,
        status: 'confirmed'
      });
      if (error) throw error;
      toast.success("Appointment booked successfully");
      onSuccess?.();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      toast.error(error.message || "Failed to book appointment");
    } finally {
      setLoading(false);
    }
  };
  const resetForm = () => {
    setSelectedDate(new Date());
    setStartTime("");
    setEndTime("");
    setNotes("");
    setUseExisting(true);
    setSelectedPatientId("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
  };
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5" />
            Manually Book Appointment
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button type="button" variant={useExisting ? "default" : "outline"} onClick={() => setUseExisting(true)} className="flex-1">
                <User className="w-4 h-4 mr-2" />
                Existing Patient
              </Button>
              <Button type="button" variant={!useExisting ? "default" : "outline"} onClick={() => setUseExisting(false)} className="flex-1">
                <User className="w-4 h-4 mr-2" />
                New Patient
              </Button>
            </div>

            {useExisting ? <div>
                <Label htmlFor="patient">Select Patient</Label>
                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(patient => <SelectItem key={patient.user_id} value={patient.user_id}>
                        {patient.full_name} ({patient.email})
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div> : <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" required={!useExisting} />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" required={!useExisting} />
                </div>
                <div>
                  <Label htmlFor="phone">
                    <Phone className="w-3 h-3 inline mr-1" />
                    Phone *
                  </Label>
                  <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" required={!useExisting} />
                </div>
                <div>
                  <Label htmlFor="email">
                    <Mail className="w-3 h-3 inline mr-1" />
                    Email (Optional)
                  </Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" />
                </div>
              </div>}
          </div>

          <Separator />

          {/* Date & Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Appointment Date</Label>
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border" disabled={date => date < new Date()} />
            </div>

            <div className="space-y-4">
              

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Appointment notes, reason for visit, etc." className="min-h-[120px]" />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Booking..." : "Book Appointment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>;
};
export default ManualBookAppointmentModal;