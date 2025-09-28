import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ScheduleModal from "./ScheduleModal";
import BlockTimeModal from "./BlockTimeModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Users, Settings } from "lucide-react";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import { useDoctorServices } from "@/hooks/useDoctorServices";
import { toast } from "sonner";

interface QuickActionModalsProps {
  isOpen: boolean;
  action: 'schedule' | 'procedures' | 'settings' | 'block-time' | null;
  onClose: () => void;
  doctorProfile?: any;
  appointments?: Array<{
    id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    status: string;
    patient_name?: string;
    notes?: string;
  }>;
}

const QuickActionModals = ({ isOpen, action, onClose, doctorProfile, appointments = [] }: QuickActionModalsProps) => {
  const { updateProfile } = useDoctorProfile();
  const { addService } = useDoctorServices();
  
  const [formData, setFormData] = useState({
    specialty: doctorProfile?.specialty || '',
    consultation_fee: doctorProfile?.consultation_fee || '',
    bio: doctorProfile?.bio || '',
    service_name: '',
    service_category: 'general',
    service_cost: '',
    service_duration: '30',
    block_start: '',
    block_end: '',
    block_reason: ''
  });

  const handleUpdateProfile = async () => {
    if (!updateProfile) return;
    
    const updates = {
      specialty: formData.specialty,
      consultation_fee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : undefined,
      bio: formData.bio
    };

    const result = await updateProfile(updates);
    if (result?.success) {
      toast.success('Profile updated successfully');
      onClose();
    }
  };

  const handleAddService = async () => {
    if (!addService) return;
    
    const serviceData = {
      name: formData.service_name,
      category: formData.service_category as any,
      description: '',
      default_cost: parseFloat(formData.service_cost) || 0,
      duration_minutes: parseInt(formData.service_duration),
      is_active: true
    };

    const result = await addService(serviceData);
    if (result?.success) {
      toast.success('Service added successfully');
      onClose();
    }
  };

  const handleBlockTime = () => {
    // Placeholder for blocking time functionality
    toast.success(`Time blocked from ${formData.block_start} to ${formData.block_end}`);
    onClose();
  };

  const renderModalContent = () => {
    switch (action) {
      case 'settings':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Quick Profile Settings
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="specialty">Specialty</Label>
                <Select value={formData.specialty} onValueChange={(value) => setFormData(prev => ({ ...prev, specialty: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general practice">General Practice</SelectItem>
                    <SelectItem value="cardiology">Cardiology</SelectItem>
                    <SelectItem value="dermatology">Dermatology</SelectItem>
                    <SelectItem value="pediatrics">Pediatrics</SelectItem>
                    <SelectItem value="orthopedics">Orthopedics</SelectItem>
                    <SelectItem value="neurology">Neurology</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="consultation_fee">Consultation Fee ($)</Label>
                <Input
                  id="consultation_fee"
                  type="number"
                  value={formData.consultation_fee}
                  onChange={(e) => setFormData(prev => ({ ...prev, consultation_fee: e.target.value }))}
                  placeholder="150"
                />
              </div>
              
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell patients about your experience..."
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleUpdateProfile}>Update Profile</Button>
              </div>
            </div>
          </>
        );

      case 'procedures':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Quick Add Service
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="service_name">Service Name</Label>
                <Input
                  id="service_name"
                  value={formData.service_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, service_name: e.target.value }))}
                  placeholder="e.g., General Consultation"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="service_category">Category</Label>
                  <Select value={formData.service_category} onValueChange={(value) => setFormData(prev => ({ ...prev, service_category: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="preventive">Preventive</SelectItem>
                      <SelectItem value="restorative">Restorative</SelectItem>
                      <SelectItem value="cosmetic">Cosmetic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="service_cost">Cost ($)</Label>
                  <Input
                    id="service_cost"
                    type="number"
                    value={formData.service_cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, service_cost: e.target.value }))}
                    placeholder="150"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="service_duration">Duration</Label>
                <Select value={formData.service_duration} onValueChange={(value) => setFormData(prev => ({ ...prev, service_duration: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleAddService}>Add Service</Button>
              </div>
            </div>
          </>
        );

      case 'block-time':
        return <BlockTimeModal isOpen={isOpen} onClose={onClose} />;

      case 'schedule':
        return <ScheduleModal isOpen={isOpen} onClose={onClose} appointments={appointments} />;

      default:
        return null;
    }
  };

  // For schedule and block-time actions, return the dedicated modals
  if (action === 'schedule') {
    return <ScheduleModal isOpen={isOpen} onClose={onClose} appointments={appointments} />;
  }
  
  if (action === 'block-time') {
    return <BlockTimeModal isOpen={isOpen} onClose={onClose} />;
  }

  return (
    <Dialog open={isOpen && action !== null} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        {renderModalContent()}
      </DialogContent>
    </Dialog>
  );
};

export default QuickActionModals;