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

interface InviteStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const staffRoles = [
  "Nurse", "Dental Hygienist", "Medical Assistant", "Receptionist", 
  "Cleaner", "Administrator", "Manager", "Pharmacy Technician"
];

const mockProviders = [
  "Dr. Sarah Johnson", "Dr. Michael Chen", "Dr. Emily Rodriguez"
];

const mockLocations = [
  "Main Office - Downtown", "West Side Clinic"
];

const permissions = [
  { id: "booking", label: "Booking Management", description: "View and manage patient appointments" },
  { id: "patients", label: "Patient Records", description: "Access patient information and history" },
  { id: "billing", label: "Billing & Payments", description: "Handle financial transactions and insurance" },
  { id: "staff", label: "Staff Management", description: "Manage other staff members" },
  { id: "reports", label: "Reports & Analytics", description: "View practice performance data" },
  { id: "settings", label: "Settings", description: "Modify practice settings and configurations" },
];

export const InviteStaffModal = ({ open, onOpenChange }: InviteStaffModalProps) => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "",
    assignedLocations: [] as string[],
    supervisor: "",
    customMessage: "",
    permissions: [] as string[]
  });
  const [uploadedPhoto, setUploadedPhoto] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Invite staff:", formData);
    onOpenChange(false);
    // Reset form
    setFormData({
      fullName: "",
      email: "",
      role: "",
      assignedLocations: [],
      supervisor: "",
      customMessage: "",
      permissions: []
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

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Staff Member</DialogTitle>
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

          {/* Role Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Role Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="supervisor">Supervisor (Optional)</Label>
                <Select value={formData.supervisor} onValueChange={(value) => setFormData(prev => ({ ...prev, supervisor: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockProviders.map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {provider}
                      </SelectItem>
                    ))}
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

          {/* Permissions Matrix */}
          <div className="space-y-4">
            <Label>Permissions</Label>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {permissions.map((permission) => (
                    <div key={permission.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={permission.id}
                        checked={formData.permissions.includes(permission.id)}
                        onCheckedChange={(checked) => handlePermissionChange(permission.id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor={permission.id} className="font-medium">
                          {permission.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Custom Message */}
          <div className="space-y-4">
            <Label htmlFor="customMessage">Custom Welcome Message (Optional)</Label>
            <Textarea
              id="customMessage"
              placeholder="Enter a personal welcome message for the new staff member..."
              value={formData.customMessage}
              onChange={(e) => setFormData(prev => ({ ...prev, customMessage: e.target.value }))}
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