import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FlaskConical, ArrowLeft, Building2 } from "lucide-react";
import { useLabCenter, LabCenterInput } from "@/hooks/useLabCenter";

const PremiumTopNav = lazy(() => import("@/components/home/premium/PremiumTopNav"));

export default function LabRegistration() {
  const navigate = useNavigate();
  const { createLabCenter, loading } = useLabCenter();
  const [formData, setFormData] = useState<LabCenterInput>({
    name: "",
    type: "laboratory",
    license_number: "",
    address: "",
    city: "",
    state: "",
    country: "UZ",
    postal_code: "",
    phone: "",
    email: "",
    website: "",
    services_offered: [],
    accreditations: [],
    accepts_insurance: true,
    average_turnaround_hours: 24,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createLabCenter(formData);
    if (result) {
      navigate("/lab/dashboard");
    }
  };

  const handleChange = (field: keyof LabCenterInput, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const labTypes = [
    { value: "laboratory", label: "Clinical Laboratory" },
    { value: "imaging", label: "Imaging Center" },
    { value: "both", label: "Laboratory & Imaging" },
  ];

  const commonServices = [
    "Blood Tests",
    "Urine Analysis",
    "Pathology",
    "Microbiology",
    "X-Ray",
    "CT Scan",
    "MRI",
    "Ultrasound",
    "ECG",
    "Endoscopy",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}><PremiumTopNav /></Suspense>
      <div className="container mx-auto py-8 px-4 max-w-3xl pt-20">
      <Button variant="ghost" className="mb-6" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <FlaskConical className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Register Lab/Imaging Center</CardTitle>
          <CardDescription>Register your laboratory or imaging center to start receiving test orders</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Basic Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Center Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Enter center name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Center Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => handleChange("type", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {labTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="license">License Number</Label>
                  <Input
                    id="license"
                    value={formData.license_number || ""}
                    onChange={(e) => handleChange("license_number", e.target.value)}
                    placeholder="Enter license number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="turnaround">Avg. Turnaround (hours)</Label>
                  <Input
                    id="turnaround"
                    type="number"
                    value={formData.average_turnaround_hours || 24}
                    onChange={(e) => handleChange("average_turnaround_hours", parseInt(e.target.value))}
                    min={1}
                  />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="font-semibold">Contact Information</h3>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Enter full address"
                  required
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Region</Label>
                  <Input
                    id="state"
                    value={formData.state || ""}
                    onChange={(e) => handleChange("state", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal">Postal Code</Label>
                  <Input
                    id="postal"
                    value={formData.postal_code || ""}
                    onChange={(e) => handleChange("postal_code", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+ X XXX XXXX XXXX"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="lab@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website || ""}
                    onChange={(e) => handleChange("website", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="space-y-4">
              <h3 className="font-semibold">Services Offered</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {commonServices.map((service) => (
                  <div key={service} className="flex items-center space-x-2">
                    <Checkbox
                      id={service}
                      checked={formData.services_offered?.includes(service)}
                      onCheckedChange={(checked) => {
                        const services = formData.services_offered || [];
                        if (checked) {
                          handleChange("services_offered", [...services, service]);
                        } else {
                          handleChange(
                            "services_offered",
                            services.filter((s) => s !== service),
                          );
                        }
                      }}
                    />
                    <Label htmlFor={service} className="text-sm">
                      {service}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Insurance */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="insurance"
                checked={formData.accepts_insurance}
                onCheckedChange={(checked) => handleChange("accepts_insurance", checked)}
              />
              <Label htmlFor="insurance">Accept Insurance</Label>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Registering..." : "Register Lab Center"}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
