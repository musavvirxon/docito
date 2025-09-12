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
import { Plus, Edit, Trash2, DollarSign, Clock, Tag } from "lucide-react";

interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  active: boolean;
  tags: string[];
}

interface DoctorServicesSectionProps {
  readOnly?: boolean;
  assignedServices?: string[];
}

const DoctorServicesSection = ({ readOnly = false, assignedServices }: DoctorServicesSectionProps) => {
  const [services, setServices] = useState<Service[]>([
    {
      id: "1",
      name: "Cardiology Consultation",
      category: "Consultation",
      description: "Comprehensive cardiovascular examination and consultation",
      price: 250,
      duration: 60,
      active: true,
      tags: ["Heart", "Consultation"]
    },
    {
      id: "2",
      name: "ECG Test",
      category: "Diagnostic",
      description: "Electrocardiogram test to monitor heart rhythm",
      price: 75,
      duration: 30,
      active: true,
      tags: ["Heart", "Test", "Diagnostic"]
    },
    {
      id: "3",
      name: "Stress Test",
      category: "Diagnostic",
      description: "Exercise stress test to evaluate heart function",
      price: 300,
      duration: 90,
      active: false,
      tags: ["Heart", "Exercise", "Test"]
    }
  ]);

  const [isAddingService, setIsAddingService] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const categories = ["Consultation", "Diagnostic", "Surgical", "Preventive", "Emergency", "Follow-up"];
  const commonTags = ["Heart", "Consultation", "Test", "Diagnostic", "Treatment", "Prevention", "Emergency"];

  const toggleServiceStatus = (serviceId: string) => {
    if (readOnly) return;
    setServices(prev => 
      prev.map(service => 
        service.id === serviceId 
          ? { ...service, active: !service.active }
          : service
      )
    );
  };

  const deleteService = (serviceId: string) => {
    if (readOnly) return;
    setServices(prev => prev.filter(service => service.id !== serviceId));
  };

  const ServiceForm = ({ service, onSave, onCancel }: { 
    service?: Service; 
    onSave: (service: Omit<Service, 'id'>) => void; 
    onCancel: () => void; 
  }) => {
    const [formData, setFormData] = useState({
      name: service?.name || '',
      category: service?.category || '',
      description: service?.description || '',
      price: service?.price || 0,
      duration: service?.duration || 30,
      active: service?.active ?? true,
      tags: service?.tags || []
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="serviceName">Service Name (Optional)</Label>
          <Input
            id="serviceName"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Cardiology Consultation"
          />
        </div>

        <div>
          <Label htmlFor="category">Category (Optional)</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
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
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
              placeholder="150"
            />
          </div>
          <div>
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Select value={formData.duration.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, duration: Number(value) }))}>
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

        <div>
          <Label>Tags</Label>
          <p className="text-sm text-muted-foreground mb-2">Select relevant tags</p>
          <div className="flex flex-wrap gap-2">
            {commonTags.map(tag => (
              <Badge
                key={tag}
                variant={formData.tags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    tags: prev.tags.includes(tag)
                      ? prev.tags.filter(t => t !== tag)
                      : [...prev.tags, tag]
                  }));
                }}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {service ? 'Update Service' : 'Add Service'}
          </Button>
        </div>
      </form>
    );
  };

  const addService = (serviceData: Omit<Service, 'id'>) => {
    const newService = {
      ...serviceData,
      id: Date.now().toString()
    };
    setServices(prev => [...prev, newService]);
    setIsAddingService(false);
  };

  const updateService = (serviceData: Omit<Service, 'id'>) => {
    if (!editingService) return;
    setServices(prev => 
      prev.map(service => 
        service.id === editingService.id 
          ? { ...serviceData, id: editingService.id }
          : service
      )
    );
    setEditingService(null);
  };

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
                  onSave={addService}
                  onCancel={() => setIsAddingService(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services.map((service) => (
              <div key={service.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{service.name}</h3>
                      <Badge variant="outline">{service.category}</Badge>
                      {service.active ? (
                        <Badge className="bg-green-100 text-green-700">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        ${service.price}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {service.duration} min
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      {service.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={service.active}
                      onCheckedChange={() => toggleServiceStatus(service.id)}
                    />
                    <Dialog open={editingService?.id === service.id} onOpenChange={(open) => !open && setEditingService(null)}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setEditingService(service)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit Service</DialogTitle>
                        </DialogHeader>
                        <ServiceForm 
                          service={editingService || undefined}
                          onSave={updateService}
                          onCancel={() => setEditingService(null)}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => deleteService(service.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorServicesSection;