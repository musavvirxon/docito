import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X } from "lucide-react";

interface InviteProviderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const specialties = [
  "Cardiologist", "Dermatologist", "Pediatrician", "Neurologist", "Orthopedist",
  "Gynecologist", "Psychiatrist", "Radiologist", "Anesthesiologist", "General Practice"
];

const languages = [
  "English", "Spanish", "French", "German", "Mandarin", "Arabic", "Russian", "Portuguese"
];

const mockServices = [
  "General Consultation", "Cardiology Consultation", "Skin Examination", "Pediatric Checkup"
];

const mockLocations = [
  "Main Office - Downtown", "West Side Clinic"
];

export const InviteProviderModal = ({ open, onOpenChange }: InviteProviderModalProps) => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    specialty: "",
    role: "",
    assignedLocations: [] as string[],
    languagesSpoken: [] as string[],
    services: [] as string[],
    welcomeMessage: ""
  });
  const [uploadedPhoto, setUploadedPhoto] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Invite provider:", formData);
    onOpenChange(false);
    // Reset form
    setFormData({
      fullName: "",
      email: "",
      specialty: "",
      role: "",
      assignedLocations: [],
      languagesSpoken: [],
      services: [],
      welcomeMessage: ""
    });
    setUploadedPhoto(null);
  };

  const handleLocationChange = (location: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      assignedLocations: checked 
        ? [...prev.assignedLocations, location]
        : prev.assignedLocations.filter(l => l !== location)
    }));
  };

  const handleLanguageChange = (language: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      languagesSpoken: checked 
        ? [...prev.languagesSpoken, language]
        : prev.languagesSpoken.filter(l => l !== language)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite New Provider</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Professional Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="specialty">Specialty</Label>
                <Select value={formData.specialty} onValueChange={(value) => setFormData(prev => ({ ...prev, specialty: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visiting">Visiting</SelectItem>
                    <SelectItem value="consultant">Consultant</SelectItem>
                    <SelectItem value="in-house">In-House</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Assigned Locations */}
          <div className="space-y-4">
            <Label>Assigned Locations</Label>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {mockLocations.map((location) => (
                    <div key={location} className="flex items-center space-x-2">
                      <Checkbox
                        id={location}
                        checked={formData.assignedLocations.includes(location)}
                        onCheckedChange={(checked) => handleLocationChange(location, checked as boolean)}
                      />
                      <Label htmlFor={location}>{location}</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Languages Spoken */}
          <div className="space-y-4">
            <Label>Languages Spoken</Label>
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  {languages.map((language) => (
                    <div key={language} className="flex items-center space-x-2">
                      <Checkbox
                        id={language}
                        checked={formData.languagesSpoken.includes(language)}
                        onCheckedChange={(checked) => handleLanguageChange(language, checked as boolean)}
                      />
                      <Label htmlFor={language}>{language}</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <Label>Services They Will Provide</Label>
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

          {/* Upload Profile Photo */}
          <div className="space-y-4">
            <Label>Profile Photo (Optional)</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              {uploadedPhoto ? (
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm">{uploadedPhoto.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadedPhoto(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Click to upload or drag and drop</p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setUploadedPhoto(file);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Welcome Message */}
          <div className="space-y-4">
            <Label htmlFor="welcomeMessage">Custom Welcome Message (Optional)</Label>
            <Textarea
              id="welcomeMessage"
              placeholder="Enter a personal welcome message for the new provider..."
              value={formData.welcomeMessage}
              onChange={(e) => setFormData(prev => ({ ...prev, welcomeMessage: e.target.value }))}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};