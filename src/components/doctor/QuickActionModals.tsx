import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TodaysScheduleModal from "./TodaysScheduleModal";
import BlockTimeModal from "./BlockTimeModal";
import AddServiceModal from "./AddServiceModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Users, Settings } from "lucide-react";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import { useDoctorServices } from "@/hooks/useDoctorServices";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface QuickActionModalsProps {
  isOpen: boolean;
  action: 'schedule' | 'procedures' | 'settings' | 'block-time' | 'add-service' | null;
  onClose: () => void;
  doctorProfile?: any;
  todaysAppointments?: any[];
}

const QuickActionModals = ({ isOpen, action, onClose, doctorProfile, todaysAppointments = [] }: QuickActionModalsProps) => {
  const { t } = useTranslation("dashboard");
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
      toast.success(t("doctor.quickModals.settings.profileUpdated"));
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
      toast.success(t("doctor.quickModals.procedures.serviceAdded"));
      onClose();
    }
  };

  const handleBlockTime = () => {
    // Placeholder for blocking time functionality
    toast.success(t("doctor.quickModals.blockTime.timeBlocked", { start: formData.block_start, end: formData.block_end }));
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
                {t("doctor.quickModals.settings.title")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="specialty">{t("doctor.quickModals.settings.specialty")}</Label>
                <Select value={formData.specialty} onValueChange={(value) => setFormData(prev => ({ ...prev, specialty: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("doctor.quickModals.settings.selectSpecialty")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general practice">{t("doctor.quickModals.settings.specialties.generalPractice")}</SelectItem>
                    <SelectItem value="cardiology">{t("doctor.quickModals.settings.specialties.cardiology")}</SelectItem>
                    <SelectItem value="dermatology">{t("doctor.quickModals.settings.specialties.dermatology")}</SelectItem>
                    <SelectItem value="pediatrics">{t("doctor.quickModals.settings.specialties.pediatrics")}</SelectItem>
                    <SelectItem value="orthopedics">{t("doctor.quickModals.settings.specialties.orthopedics")}</SelectItem>
                    <SelectItem value="neurology">{t("doctor.quickModals.settings.specialties.neurology")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="consultation_fee">{t("doctor.quickModals.settings.consultationFee")}</Label>
                <Input
                  id="consultation_fee"
                  type="number"
                  value={formData.consultation_fee}
                  onChange={(e) => setFormData(prev => ({ ...prev, consultation_fee: e.target.value }))}
                  placeholder="150"
                />
              </div>
              
              <div>
                <Label htmlFor="bio">{t("doctor.quickModals.settings.bio")}</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder={t("doctor.quickModals.settings.bioPlaceholder")}
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>{t("doctor.quickModals.settings.cancel")}</Button>
                <Button onClick={handleUpdateProfile}>{t("doctor.quickModals.settings.updateProfile")}</Button>
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
                {t("doctor.quickModals.procedures.title")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="service_name">{t("doctor.quickModals.procedures.serviceName")}</Label>
                <Input
                  id="service_name"
                  value={formData.service_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, service_name: e.target.value }))}
                  placeholder={t("doctor.quickModals.procedures.serviceNamePlaceholder")}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="service_category">{t("doctor.quickModals.procedures.category")}</Label>
                  <Select value={formData.service_category} onValueChange={(value) => setFormData(prev => ({ ...prev, service_category: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">{t("doctor.quickModals.procedures.categories.general")}</SelectItem>
                      <SelectItem value="preventive">{t("doctor.quickModals.procedures.categories.preventive")}</SelectItem>
                      <SelectItem value="restorative">{t("doctor.quickModals.procedures.categories.restorative")}</SelectItem>
                      <SelectItem value="cosmetic">{t("doctor.quickModals.procedures.categories.cosmetic")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="service_cost">{t("doctor.quickModals.procedures.cost")}</Label>
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
                <Label htmlFor="service_duration">{t("doctor.quickModals.procedures.duration")}</Label>
                <Select value={formData.service_duration} onValueChange={(value) => setFormData(prev => ({ ...prev, service_duration: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">{t("doctor.quickModals.procedures.durations.15min")}</SelectItem>
                    <SelectItem value="30">{t("doctor.quickModals.procedures.durations.30min")}</SelectItem>
                    <SelectItem value="45">{t("doctor.quickModals.procedures.durations.45min")}</SelectItem>
                    <SelectItem value="60">{t("doctor.quickModals.procedures.durations.1hour")}</SelectItem>
                    <SelectItem value="90">{t("doctor.quickModals.procedures.durations.1.5hours")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>{t("doctor.quickModals.procedures.cancel")}</Button>
                <Button onClick={handleAddService}>{t("doctor.quickModals.procedures.addService")}</Button>
              </div>
            </div>
          </>
        );

      case 'block-time':
        return <BlockTimeModal isOpen={isOpen} onClose={onClose} />;

      case 'schedule':
        return <TodaysScheduleModal isOpen={isOpen} onClose={onClose} appointments={todaysAppointments} />;
      
      case 'add-service':
        return <AddServiceModal isOpen={isOpen} onClose={onClose} />;

      default:
        return null;
    }
  };

  // For schedule and block-time actions, return the dedicated modals
  if (action === 'schedule') {
    return <TodaysScheduleModal isOpen={isOpen} onClose={onClose} appointments={todaysAppointments} />;
  }
  
  if (action === 'add-service') {
    return <AddServiceModal isOpen={isOpen} onClose={onClose} />;
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