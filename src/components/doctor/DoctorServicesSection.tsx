import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, DollarSign, Clock } from "lucide-react";
import { useDoctorData } from "@/contexts/DoctorDataContext";
import { useTranslation } from "react-i18next";

interface DoctorServicesSectionProps {
  readOnly?: boolean;
  assignedServices?: string[];
}

interface ServiceFormData {
  name: string;
  category: 'general' | 'preventive' | 'restorative' | 'cosmetic' | 'orthodontic' | 'oral_surgery' | 'endodontic' | 'periodontic';
  description: string;
  default_cost: number;
  duration_minutes: number;
  is_active: boolean;
}

const DoctorServicesSection = ({ readOnly = false, assignedServices }: DoctorServicesSectionProps) => {
  const { t } = useTranslation("dashboard");
  const { services, loading, addService, updateService, deleteService } = useDoctorData();
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const categories = ['general', 'preventive', 'restorative', 'cosmetic', 'orthodontic', 'oral_surgery', 'endodontic', 'periodontic'] as const;

  const handleToggleStatus = async (serviceId: string, active: boolean) => {
    if (readOnly) return;
    await updateService(serviceId, { is_active: active });
  };

  const handleDeleteService = async (serviceId: string) => {
    if (readOnly) return;
    if (confirm(t("doctor.services.confirmDelete") || 'Are you sure you want to delete this service?')) {
      await deleteService(serviceId);
    }
  };

  const ServiceForm = ({ serviceId, onSave, onCancel }: { 
    serviceId?: string; 
    onSave: (serviceData: ServiceFormData) => void; 
    onCancel: () => void; 
  }) => {
    const existingService = serviceId ? services.find(s => s.id === serviceId) : null;
    
    const [formData, setFormData] = useState<ServiceFormData>({
      name: existingService?.name || '',
      category: (existingService?.category as any) || 'general',
      description: existingService?.description || '',
      default_cost: existingService?.default_cost || 0,
      duration_minutes: existingService?.duration_minutes || 30,
      is_active: existingService?.is_active ?? true
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="serviceName">{t("doctor.services.serviceName")}</Label>
          <Input
            id="serviceName"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder={t("doctor.services.serviceNamePlaceholder")}
          />
        </div>

        <div>
          <Label htmlFor="category">{t("doctor.services.category")}</Label>
          <Select value={formData.category} onValueChange={(value: any) => setFormData(prev => ({ ...prev, category: value }))}>
            <SelectTrigger>
              <SelectValue placeholder={t("doctor.services.selectCategory")} />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="description">{t("doctor.services.description")}</Label>
          <Textarea 
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder={t("doctor.services.descriptionPlaceholder")}
            className="min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price">{t("doctor.services.price")}</Label>
            <Input 
              id="price"
              type="number"
              value={formData.default_cost}
              onChange={(e) => setFormData(prev => ({ ...prev, default_cost: Number(e.target.value) }))}
              placeholder="150"
            />
          </div>
          <div>
            <Label htmlFor="duration">{t("doctor.services.duration")}</Label>
            <Select value={formData.duration_minutes.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, duration_minutes: Number(value) }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("doctor.services.cancel")}
          </Button>
          <Button type="submit">
            {serviceId ? t("doctor.services.updateService") : t("doctor.services.addService")}
          </Button>
        </div>
      </form>
    );
  };

  const handleAddService = async (serviceData: ServiceFormData) => {
    const result = await addService(serviceData);
    if (result.success) {
      setIsAddingService(false);
    }
  };

  const handleUpdateService = async (serviceData: ServiceFormData) => {
    if (!editingServiceId) return;
    const result = await updateService(editingServiceId, serviceData);
    if (result.success) {
      setEditingServiceId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("doctor.services.assignedServices")}</CardTitle>
            <p className="text-muted-foreground">{t("doctor.services.assignedServicesDesc")}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignedServices?.map((serviceName, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{serviceName}</h3>
                      <p className="text-sm text-muted-foreground">{t("doctor.services.assignedByClinic")}</p>
                    </div>
                    <Badge variant="secondary">{t("doctor.services.assigned")}</Badge>
                  </div>
                </div>
              )) || (
                <p className="text-muted-foreground">{t("doctor.services.noServicesAssigned")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t("doctor.services.title")}</CardTitle>
              <p className="text-muted-foreground">{t("doctor.services.description")}</p>
            </div>
            <Dialog open={isAddingService} onOpenChange={setIsAddingService}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("doctor.services.addService")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t("doctor.services.addNewService")}</DialogTitle>
                </DialogHeader>
                <ServiceForm 
                  onSave={handleAddService}
                  onCancel={() => setIsAddingService(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t("doctor.services.noServices")}</p>
              </div>
            ) : (
              services.map((service) => (
                <div key={service.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{service.name}</h3>
                        <Badge variant="outline">
                          {service.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                        {service.is_active ? (
                          <Badge className="bg-green-100 text-green-700">{t("doctor.services.active")}</Badge>
                        ) : (
                          <Badge variant="secondary">{t("doctor.services.inactive")}</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          ${service.default_cost || 0}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {service.duration_minutes} min
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={service.is_active}
                        onCheckedChange={(checked) => handleToggleStatus(service.id, checked)}
                      />
                      <Dialog open={editingServiceId === service.id} onOpenChange={(open) => !open && setEditingServiceId(null)}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setEditingServiceId(service.id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit Service</DialogTitle>
                          </DialogHeader>
                          <ServiceForm 
                            serviceId={editingServiceId || undefined}
                            onSave={handleUpdateService}
                            onCancel={() => setEditingServiceId(null)}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteService(service.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorServicesSection;