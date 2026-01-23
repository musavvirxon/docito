import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Loader2, ArrowLeft, User, Phone, Mail, MapPin, Heart, 
  Pill, FileText, Camera, Upload, X, Calendar, AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (patientId: string) => void;
}

const patientSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(255, "Name too long"),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  gender: z.string().optional(),
  phone: z.string().trim().min(1, "Phone number is required").max(50, "Phone number too long"),
  email: z.string().trim().email("Invalid email format").max(255, "Email too long").or(z.literal("")),
  address: z.string().max(1000, "Address too long").optional(),
  emergency_contact_name: z.string().max(255, "Name too long").optional(),
  emergency_contact_phone: z.string().max(50, "Phone too long").optional(),
  allergies: z.string().max(2000, "Text too long").optional(),
  medical_history: z.string().max(5000, "Text too long").optional(),
  dental_history: z.string().max(5000, "Text too long").optional(),
  current_medications: z.string().max(2000, "Text too long").optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  registration_date: z.string().optional(),
  notes: z.string().max(2000, "Notes too long").optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

const AddPatientModal = ({ isOpen, onClose, onSuccess }: AddPatientModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState<PatientFormData>({
    full_name: "",
    date_of_birth: "",
    gender: "",
    phone: "",
    email: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    allergies: "",
    medical_history: "",
    dental_history: "",
    current_medications: "",
    status: "active",
    registration_date: today,
    notes: "",
  });

  const calculatedAge = useMemo(() => {
    if (!formData.date_of_birth) return null;
    const dob = new Date(formData.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }, [formData.date_of_birth]);

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or WebP image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const removePhoto = useCallback(() => {
    setPhotoFile(null);
    setPhotoPreview(null);
  }, []);

  const updateField = useCallback((field: keyof PatientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [errors]);

  const uploadPhoto = async (patientId: string): Promise<string | null> => {
    if (!photoFile) return null;

    try {
      setUploadingPhoto(true);
      const fileExt = photoFile.name.split(".").pop();
      const fileName = `patients/${patientId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, photoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(fileName);
      return publicUrl.publicUrl;
    } catch (err) {
      console.error("Photo upload error:", err);
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    const result = patientSchema.safeParse(formData);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      toast.error("Please fix the form errors");
      return;
    }

    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    setLoading(true);
    try {
      // Get doctor ID
      const { data: doctorData, error: doctorError } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (doctorError || !doctorData) {
        toast.error("Could not find your doctor profile");
        return;
      }

      // Insert patient first to get ID
      const { data: patientData, error: insertError } = await supabase
        .from("doctor_patients")
        .insert({
          doctor_id: doctorData.id,
          full_name: result.data.full_name,
          date_of_birth: result.data.date_of_birth,
          gender: result.data.gender || null,
          phone: result.data.phone,
          email: result.data.email || null,
          address: result.data.address || null,
          emergency_contact_name: result.data.emergency_contact_name || null,
          emergency_contact_phone: result.data.emergency_contact_phone || null,
          allergies: result.data.allergies || null,
          medical_history: result.data.medical_history || null,
          dental_history: result.data.dental_history || null,
          current_medications: result.data.current_medications || null,
          status: result.data.status,
          registration_date: result.data.registration_date || today,
          notes: result.data.notes || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Upload photo if exists
      if (photoFile && patientData) {
        const photoUrl = await uploadPhoto(patientData.id);
        if (photoUrl) {
          await supabase
            .from("doctor_patients")
            .update({ profile_photo_url: photoUrl })
            .eq("id", patientData.id);
        }
      }

      toast.success("Patient added successfully!");
      onSuccess(patientData.id);
    } catch (err: any) {
      console.error("Error creating patient:", err);
      toast.error(err.message || "Failed to create patient");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      date_of_birth: "",
      gender: "",
      phone: "",
      email: "",
      address: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      allergies: "",
      medical_history: "",
      dental_history: "",
      current_medications: "",
      status: "active",
      registration_date: today,
      notes: "",
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={handleClose} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Patients
            </Button>
          </div>
          <DialogTitle className="text-2xl font-semibold">Add New Patient</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-8">
            {/* Personal Information */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-medium">Personal Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Photo Upload */}
                <div className="md:row-span-2 flex flex-col items-center">
                  <Label className="mb-2">Profile Photo</Label>
                  <div className="relative group">
                    <Avatar className="w-32 h-32 border-2 border-dashed border-muted-foreground/30">
                      <AvatarImage src={photoPreview || undefined} />
                      <AvatarFallback className="bg-muted">
                        <Camera className="w-8 h-8 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handlePhotoChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePhoto();
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Click to upload<br />JPG, PNG, WebP (max 5MB)
                  </p>
                </div>

                {/* Name and DOB */}
                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">
                        Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => updateField("full_name", e.target.value)}
                        placeholder="Enter full name"
                        className={errors.full_name ? "border-destructive" : ""}
                      />
                      {errors.full_name && (
                        <p className="text-xs text-destructive">{errors.full_name}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth">
                        Date of Birth <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => updateField("date_of_birth", e.target.value)}
                        max={today}
                        className={errors.date_of_birth ? "border-destructive" : ""}
                      />
                      {errors.date_of_birth && (
                        <p className="text-xs text-destructive">{errors.date_of_birth}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Age</Label>
                      <div className="h-10 px-3 py-2 border rounded-md bg-muted/50 flex items-center">
                        {calculatedAge !== null ? (
                          <span>{calculatedAge} years old</span>
                        ) : (
                          <span className="text-muted-foreground">Auto-calculated from DOB</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(v) => updateField("gender", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* Contact Information */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Phone className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-medium">Contact Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+1 234 567 8900"
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="patient@email.com"
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="Enter full address"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => updateField("emergency_contact_name", e.target.value)}
                    placeholder="Contact person name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => updateField("emergency_contact_phone", e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Medical Information */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-medium">Medical Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="allergies" className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Allergies
                  </Label>
                  <Textarea
                    id="allergies"
                    value={formData.allergies}
                    onChange={(e) => updateField("allergies", e.target.value)}
                    placeholder="List any known allergies..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current_medications" className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-blue-500" />
                    Current Medications
                  </Label>
                  <Textarea
                    id="current_medications"
                    value={formData.current_medications}
                    onChange={(e) => updateField("current_medications", e.target.value)}
                    placeholder="List current medications..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medical_history">Medical History</Label>
                  <Textarea
                    id="medical_history"
                    value={formData.medical_history}
                    onChange={(e) => updateField("medical_history", e.target.value)}
                    placeholder="Past medical conditions, surgeries, etc."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dental_history">Dental History</Label>
                  <Textarea
                    id="dental_history"
                    value={formData.dental_history}
                    onChange={(e) => updateField("dental_history", e.target.value)}
                    placeholder="Previous dental work, treatments, etc."
                    rows={3}
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Administrative Information */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-medium">Administrative Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Patient Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => updateField("status", v as "active" | "inactive")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          Active
                        </div>
                      </SelectItem>
                      <SelectItem value="inactive">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-400" />
                          Inactive
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registration_date">Registration Date</Label>
                  <Input
                    id="registration_date"
                    type="date"
                    value={formData.registration_date}
                    onChange={(e) => updateField("registration_date", e.target.value)}
                    max={today}
                  />
                </div>
                <div className="md:col-span-3 space-y-2">
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    placeholder="Notes for internal staff only..."
                    rows={2}
                  />
                </div>
              </div>
            </section>
          </form>
        </ScrollArea>

        {/* Sticky Footer */}
        <div className="flex justify-end gap-3 p-6 pt-4 border-t bg-background">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || uploadingPhoto}>
            {(loading || uploadingPhoto) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {uploadingPhoto ? "Uploading Photo..." : loading ? "Saving..." : "Save Patient"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddPatientModal;
