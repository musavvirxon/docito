import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDoctorData } from "@/contexts/DoctorDataContext";
import { toast } from "sonner";

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ServiceFormData {
  name: string;
  category: 'general' | 'preventive' | 'restorative' | 'cosmetic' | 'orthodontic' | 'oral_surgery' | 'endodontic' | 'periodontic';
  description: string;
  default_cost: number;
  duration_minutes: number;
  is_active: boolean;
}

const AddServiceModal = ({ isOpen, onClose }: AddServiceModalProps) => {
  const { addService } = useDoctorData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    category: 'general',
    description: '',
    default_cost: 0,
    duration_minutes: 30,
    is_active: true
  });

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'preventive', label: 'Preventive' },
    { value: 'restorative', label: 'Restorative' },
    { value: 'cosmetic', label: 'Cosmetic' },
    { value: 'orthodontic', label: 'Orthodontic' },
    { value: 'oral_surgery', label: 'Oral Surgery' },
    { value: 'endodontic', label: 'Endodontic' },
    { value: 'periodontic', label: 'Periodontic' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Service name is required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await addService(formData);
      
      if (result.success) {
        toast.success('Service added successfully');
        setFormData({
          name: '',
          category: 'general',
          description: '',
          default_cost: 0,
          duration_minutes: 30,
          is_active: true
        });
        onClose();
      } else {
        toast.error(result.error || 'Failed to add service');
      }
    } catch (error) {
      toast.error('Failed to add service');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Service</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="serviceName">Service Name *</Label>
            <Input
              id="serviceName"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., General Consultation"
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value: any) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
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
                value={formData.default_cost || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, default_cost: Number(e.target.value) }))}
                placeholder="150"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select 
                value={formData.duration_minutes.toString()} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, duration_minutes: Number(value) }))}
              >
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Service'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddServiceModal;