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
    }
  }, [isOpen, prefilledDate]);
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
    if (!selectedDate || !prefilledTime) {
      toast.error("Please select a valid time slot");
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
    
    console.log('🚀 Starting appointment booking...');
    setLoading(true);

    try {
      let patientId = selectedPatientId;
      let isNewPatient = false;
      let isVerified = false;
      let verificationToken = null;

      // If booking for new patient, create or find patient profile
      if (!useExisting) {
        const fullName = `${firstName} ${lastName}`;
        const trimmedEmail = email?.trim() || null;
        const trimmedPhone = phone?.trim() || null;

        const { data: result, error: profileError } = await supabase
          .rpc('create_or_get_patient_profile', {
            p_full_name: fullName,
            p_email: trimmedEmail,
            p_phone: trimmedPhone
          });
        
        if (profileError) throw profileError;
        
        const resultData = result as { 
          success: boolean; 
          user_id?: string; 
          error?: string; 
          is_existing?: boolean;
          is_verified?: boolean;
          verification_token?: string;
        };
        
        if (!resultData || !resultData.success) {
          throw new Error(resultData?.error || "Failed to find/create patient profile");
        }
        
        patientId = resultData.user_id!;
        isNewPatient = !resultData.is_existing;
        isVerified = resultData.is_verified || false;
        verificationToken = resultData.verification_token;
        
        console.log('Patient profile:', { patientId, isNewPatient, isVerified });
      }

      // Calculate end time (default 30 min slot)
      const startTime = prefilledTime;
      const [hours, minutes] = startTime.split(':').map(Number);
      const endDate = new Date();
      endDate.setHours(hours, minutes + 30, 0, 0);
      const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          doctor_id: doctorId,
          patient_id: patientId,
          practice_id: practiceId || null,
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: startTime,
          end_time: endTime,
          notes: notes,
          status: 'confirmed'
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;
      
      console.log('✅ Appointment created:', appointment);

      // Send SMS if new unverified patient with phone
      if (isNewPatient && !isVerified && phone && verificationToken) {
        console.log('📱 Sending SMS to new patient...');
        
        const { data: doctorProfile } = await supabase
          .from('doctors')
          .select('user_id')
          .eq('id', doctorId)
          .single();

        if (doctorProfile) {
          const { data: doctorUserProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', doctorProfile.user_id)
            .single();

          const doctorName = doctorUserProfile?.full_name || 'Your doctor';

          const { data: smsResult, error: smsError } = await supabase
            .rpc('send_patient_invitation_sms', {
              p_patient_id: patientId,
              p_phone: phone,
              p_verification_token: verificationToken,
              p_doctor_name: doctorName,
              p_appointment_date: new Date(selectedDate).toISOString()
            });

          if (smsError) {
            console.error('SMS error:', smsError);
          } else {
            console.log('✅ SMS queued:', smsResult);
          }
        }

        toast.success("Appointment booked! Invitation SMS queued for patient.");
      } else if (isNewPatient && !phone) {
        toast.success("Appointment booked for new patient");
      } else if (!isNewPatient) {
        toast.success("Appointment booked for existing patient");
      } else {
        toast.success("Appointment booked successfully");
      }

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
              className="min-h-[140px]" 
            />
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