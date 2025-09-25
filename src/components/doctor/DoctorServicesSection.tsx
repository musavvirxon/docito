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
import { useDoctorServices } from "@/hooks/useDoctorServices";

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
  const { services, loading, addService, updateService, deleteService, toggleServiceStatus } = useDoctorServices();
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const categories = ['general', 'preventive', 'restorative', 'cosmetic', 'orthodontic', 'oral_surgery', 'endodontic', 'periodontic'] as const;

  const handleToggleStatus = async (serviceId: string, active: boolean) => {
    if (readOnly) return;
    await toggleServiceStatus(serviceId, active);
  };

  const handleDeleteService = async (serviceId: string) => {
    if (readOnly) return;
    if (confirm('Are you sure you want to delete this service?')) {
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
          <Label htmlFor="serviceName">Service Name</Label>
          <Input
            id="serviceName"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., General Consultation"
          />
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(value: any) => setFormData(prev => ({ ...prev, category: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
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
          <Label htmlFor="description">Description</Label>
          <Textarea 
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the service..."
            className="min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price">Price ($)</Label>
            <Input 
              id="price"
              type="number"
              value={formData.default_cost}
              onChange={(e) => setFormData(prev => ({ ...prev, default_cost: Number(e.target.value) }))}
              placeholder="150"
            />
          </div>
          <div>
            <Label htmlFor="duration">Duration (minutes)</Label>
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
            Cancel
          </Button>
          <Button type="submit">
            {serviceId ? 'Update Service' : 'Add Service'}
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
            <CardTitle>Assigned Services</CardTitle>
            <p className="text-muted-foreground">Services assigned to you by the clinic</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignedServices?.map((serviceName, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{serviceName}</h3>
                      <p className="text-sm text-muted-foreground">Assigned by clinic administration</p>
                    </div>
                    <Badge variant="secondary">Assigned</Badge>
                  </div>
                </div>
              )) || (
                <p className="text-muted-foreground">No services assigned yet.</p>
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
              <CardTitle>My Services</CardTitle>
              <p className="text-muted-foreground">Manage the services you offer to patients</p>
            </div>
            <Dialog open={isAddingService} onOpenChange={setIsAddingService}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Service</DialogTitle>
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
                <p>No services found. Add your first service to get started.</p>
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
                          <Badge className="bg-green-100 text-green-700">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
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