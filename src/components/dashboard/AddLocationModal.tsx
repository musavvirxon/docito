import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Clock } from "lucide-react";

interface AddLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mockProviders = [
  "Dr. Sarah Johnson", "Dr. Michael Chen", "Dr. Emily Rodriguez"
];

const mockServices = [
  "General Consultation", "Cardiology Consultation", "Skin Examination", "Pediatric Checkup"
];

const daysOfWeek = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

export const AddLocationModal = ({ open, onOpenChange }: AddLocationModalProps) => {
  const [formData, setFormData] = useState({
    locationName: "",
    address: "",
    zipCode: "",
    phoneNumber: "",
    email: "",
    assignedProviders: [] as string[],
    services: [] as string[],
    coordinates: ""
  });

  const [workingHours, setWorkingHours] = useState(
    daysOfWeek.reduce((acc, day) => ({
      ...acc,
      [day]: { isOpen: true, startTime: "09:00", endTime: "17:00" }
    }), {} as Record<string, { isOpen: boolean; startTime: string; endTime: string }>)
  );

  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Add location:", { formData, workingHours, uploadedPhotos });
    onOpenChange(false);
    // Reset form
    setFormData({
      locationName: "",
      address: "",
      zipCode: "",
      phoneNumber: "",
      email: "",
      assignedProviders: [],
      services: [],
      coordinates: ""
    });
    setWorkingHours(
      daysOfWeek.reduce((acc, day) => ({
        ...acc,
        [day]: { isOpen: true, startTime: "09:00", endTime: "17:00" }
      }), {} as Record<string, { isOpen: boolean; startTime: string; endTime: string }>)
    );
    setUploadedPhotos([]);
  };

  const handleProviderChange = (provider: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      assignedProviders: checked 
        ? [...prev.assignedProviders, provider]
        : prev.assignedProviders.filter(p => p !== provider)
    }));
  };

  const handleServiceChange = (service: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      services: checked 
        ? [...prev.services, service]
        : prev.services.filter(s => s !== service)
    }));
  };

  const handleWorkingHoursChange = (day: string, field: string, value: string | boolean) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const addPhoto = (file: File) => {
    if (uploadedPhotos.length < 6) {
      setUploadedPhotos(prev => [...prev, file]);
    }
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Location</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Location Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Location Details</h3>
                <div>
                  <Label htmlFor="locationName">Location Name</Label>
                  <Input
                    id="locationName"
                    value={formData.locationName}
                    onChange={(e) => setFormData(prev => ({ ...prev, locationName: e.target.value }))}
                    placeholder="e.g., Downtown Medical Center"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="123 Medical Center Dr"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="zipCode">ZIP / Postal Code</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                        placeholder="12345"
                      />
                  </div>
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        placeholder="(555) 123-4567"
                      />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="location@practice.com"
                  />
                </div>

                <div>
                  <Label htmlFor="coordinates">Map Coordinates (Optional)</Label>
                  <Input
                    id="coordinates"
                    value={formData.coordinates}
                    onChange={(e) => setFormData(prev => ({ ...prev, coordinates: e.target.value }))}
                    placeholder="40.7128, -74.0060"
                  />
                </div>
              </div>

              {/* Working Hours */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Working Hours</h3>
                </div>
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {daysOfWeek.map((day) => (
                        <div key={day} className="flex items-center gap-4">
                          <div className="w-20">
                            <Checkbox
                              id={day}
                              checked={workingHours[day]?.isOpen}
                              onCheckedChange={(checked) => handleWorkingHoursChange(day, "isOpen", checked as boolean)}
                            />
                            <Label htmlFor={day} className="ml-2 text-sm">
                              {day.slice(0, 3)}
                            </Label>
                          </div>
                          {workingHours[day]?.isOpen && (
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={workingHours[day]?.startTime}
                                onChange={(e) => handleWorkingHoursChange(day, "startTime", e.target.value)}
                                className="w-24"
                              />
                              <span className="text-sm text-muted-foreground">to</span>
                              <Input
                                type="time"
                                value={workingHours[day]?.endTime}
                                onChange={(e) => handleWorkingHoursChange(day, "endTime", e.target.value)}
                                className="w-24"
                              />
                            </div>
                          )}
                          {!workingHours[day]?.isOpen && (
                            <span className="text-sm text-muted-foreground">Closed</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Assigned Providers */}
              <div className="space-y-4">
                <Label>Assign Providers/Staff</Label>
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {mockProviders.map((provider) => (
                        <div key={provider} className="flex items-center space-x-2">
                          <Checkbox
                            id={provider}
                            checked={formData.assignedProviders.includes(provider)}
                            onCheckedChange={(checked) => handleProviderChange(provider, checked as boolean)}
                          />
                          <Label htmlFor={provider}>{provider}</Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Services Offered */}
              <div className="space-y-4">
                <Label>Services Offered</Label>
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {mockServices.map((service) => (
                        <div key={service} className="flex items-center space-x-2">
                          <Checkbox
                            id={service}
                            checked={formData.services.includes(service)}
                            onCheckedChange={(checked) => handleServiceChange(service, checked as boolean)}
                          />
                          <Label htmlFor={service}>{service}</Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Photo Upload */}
              <div className="space-y-4">
                <Label>Location Photos (Up to 6)</Label>
                <div className="space-y-4">
                  {uploadedPhotos.length < 6 && (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Click to upload photos ({uploadedPhotos.length}/6)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Reception, waiting area, entrance, treatment rooms, etc.
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          files.forEach(file => addPhoto(file));
                        }}
                      />
                    </div>
                  )}
                  
                  {uploadedPhotos.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {uploadedPhotos.map((photo, index) => (
                        <div key={index} className="relative bg-muted p-2 rounded">
                          <div className="flex items-center justify-between">
                            <span className="text-sm truncate">{photo.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePhoto(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Location
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};