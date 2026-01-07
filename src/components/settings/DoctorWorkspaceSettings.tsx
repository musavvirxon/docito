import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Stethoscope, Clock, Calendar, DollarSign, GraduationCap, 
  Building2, CreditCard, FileText, Loader2, Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function DoctorWorkspaceSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState<any>(null);
  
  // Professional profile
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  
  // Scheduling
  const [slotDuration, setSlotDuration] = useState("30");
  const [maxDailyAppointments, setMaxDailyAppointments] = useState("20");
  const [acceptsNewPatients, setAcceptsNewPatients] = useState(true);
  
  // Pricing
  const [consultationFee, setConsultationFee] = useState("");
  const [telemedEnabled, setTelemedEnabled] = useState(false);

  useEffect(() => {
    const fetchDoctorData = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("doctors")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
          setDoctor(data);
          setSpecialty(data.specialty || "");
          setBio(data.bio || "");
          setLicenseNumber(data.license_number || "");
          setYearsExperience(data.years_experience?.toString() || "");
          setConsultationFee(data.consultation_fee?.toString() || "");
          setAcceptsNewPatients(data.accepts_new_patients ?? true);
          setTelemedEnabled(data.consultation_types?.includes("telehealth") || false);
        }
      } catch (err) {
        console.error("Error fetching doctor data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDoctorData();
  }, [user]);

  const handleSave = async () => {
    if (!user || !doctor) return;
    
    setSaving(true);
    try {
      const consultationTypes = telemedEnabled 
        ? ["in_person", "telehealth"]
        : ["in_person"];
      
      const { error } = await supabase
        .from("doctors")
        .update({
          specialty,
          bio,
          license_number: licenseNumber,
          years_experience: yearsExperience ? parseInt(yearsExperience) : null,
          consultation_fee: consultationFee ? parseFloat(consultationFee) : null,
          accepts_new_patients: acceptsNewPatients,
          consultation_types: consultationTypes,
        })
        .eq("id", doctor.id);
      
      if (error) throw error;
      toast.success("Professional settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No doctor profile found.</p>
          <Button variant="outline" className="mt-4">Complete Doctor Registration</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Professional Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Professional Profile
          </CardTitle>
          <CardDescription>Your medical credentials and specialization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Specialty</Label>
              <Input 
                value={specialty} 
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="e.g., General Dentistry"
              />
            </div>
            <div className="space-y-2">
              <Label>License Number</Label>
              <Input 
                value={licenseNumber} 
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="Medical license number"
              />
            </div>
            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Input 
                type="number"
                value={yearsExperience} 
                onChange={(e) => setYearsExperience(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Bio / About</Label>
            <Textarea 
              value={bio} 
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell patients about yourself..."
              rows={4}
            />
          </div>
          
          <div className="flex items-center gap-2 pt-2">
            <Badge variant={doctor.verified ? "default" : "secondary"}>
              {doctor.verified ? (
                <><Check className="h-3 w-3 mr-1" /> Verified</>
              ) : (
                "Pending Verification"
              )}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Scheduling Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Availability & Scheduling
          </CardTitle>
          <CardDescription>Configure your appointment settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Slot Duration (minutes)</Label>
              <Select value={slotDuration} onValueChange={setSlotDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max Daily Appointments</Label>
              <Input 
                type="number"
                value={maxDailyAppointments} 
                onChange={(e) => setMaxDailyAppointments(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="font-medium">Accept New Patients</p>
              <p className="text-sm text-muted-foreground">Allow new patients to book with you</p>
            </div>
            <Switch checked={acceptsNewPatients} onCheckedChange={setAcceptsNewPatients} />
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing & Services
          </CardTitle>
          <CardDescription>Set your consultation fees</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Consultation Fee ($)</Label>
            <Input 
              type="number"
              value={consultationFee} 
              onChange={(e) => setConsultationFee(e.target.value)}
              placeholder="0.00"
            />
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="font-medium">Telemedicine</p>
              <p className="text-sm text-muted-foreground">Offer video consultations</p>
            </div>
            <Switch checked={telemedEnabled} onCheckedChange={setTelemedEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Professional Settings
        </Button>
      </div>
    </div>
  );
}

export default DoctorWorkspaceSettings;
