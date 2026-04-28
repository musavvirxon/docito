import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Phone,
  Heart,
  Shield,
  Activity,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const patientSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().trim().max(20, "Phone must be less than 20 characters").optional(),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  address: z.string().trim().max(500, "Address must be less than 500 characters").optional(),
  profession: z.string().trim().max(255, "Profession must be less than 255 characters").optional(),
  emergency_contact_name: z.string().trim().max(100).optional(),
  emergency_contact_phone: z.string().trim().max(20).optional(),
  blood_group: z.string().optional(),
  allergies: z.string().trim().max(1000).optional(),
  medical_history: z.string().trim().max(2000).optional(),
  dental_history: z.string().trim().max(2000).optional(),
  current_medications: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(2000).optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface EditPatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: any;
  patientType: "appointment" | "direct";
  onSuccess: () => void;
}

const EditPatientModal = ({
  open,
  onOpenChange,
  patient,
  patientType,
  onSuccess,
}: EditPatientModalProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("personal");
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
  });

  useEffect(() => {
    if (patient && open) {
      reset({
        full_name: patient.full_name || "",
        date_of_birth: patient.date_of_birth || "",
        gender: patient.gender || "",
        phone: patient.phone || "",
        email: patient.email || "",
        address: patient.address || "",
        profession: patient.profession || "",
        emergency_contact_name: patient.emergency_contact_name || "",
        emergency_contact_phone: patient.emergency_contact_phone || "",
        blood_group: patient.blood_group || "",
        allergies: patient.allergies || "",
        medical_history: patient.medical_history || "",
        dental_history: patient.dental_history || "",
        current_medications: patient.current_medications || "",
        notes: patient.notes || "",
      });
      setAvatarUrl(patient.avatar_url || patient.profile_photo_url || null);
    }
  }, [patient, open, reset]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `patients/${patient.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(urlData.publicUrl);
      toast.success("Photo uploaded");
    } catch (err) {
      console.error("Error uploading avatar:", err);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: PatientFormData) => {
    if (!user) return;

    setSaving(true);
    try {
      if (patientType === "direct") {
        const { error } = await supabase
          .from("doctor_patients")
          .update({
            full_name: data.full_name,
            date_of_birth: data.date_of_birth || null,
            gender: data.gender || null,
            phone: data.phone || null,
            email: data.email || null,
            address: data.address || null,
            profession: data.profession || null,
            emergency_contact_name: data.emergency_contact_name || null,
            emergency_contact_phone: data.emergency_contact_phone || null,
            allergies: data.allergies || null,
            medical_history: data.medical_history || null,
            dental_history: data.dental_history || null,
            current_medications: data.current_medications || null,
            notes: data.notes || null,
            profile_photo_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", patient.id);

        if (error) throw error;
      } else {
        // For appointment-based patients, update profiles table
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: data.full_name,
            date_of_birth: data.date_of_birth || null,
            gender: data.gender as any || null,
            phone: data.phone || null,
            address: data.address || null,
            profession: data.profession || null,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", patient.id);

        if (error) throw error;
      }

      toast.success("Patient updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error("Error updating patient:", err);
      toast.error("Failed to update patient");
    } finally {
      setSaving(false);
    }
  };

  const initials = patient?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || "P";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Patient</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal" className="gap-2 text-xs sm:text-sm">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Personal</span>
              </TabsTrigger>
              <TabsTrigger value="contact" className="gap-2 text-xs sm:text-sm">
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">Contact</span>
              </TabsTrigger>
              <TabsTrigger value="medical" className="gap-2 text-xs sm:text-sm">
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">Medical</span>
              </TabsTrigger>
              <TabsTrigger value="other" className="gap-2 text-xs sm:text-sm">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Other</span>
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4 pr-4">
              <TabsContent value="personal" className="space-y-4 mt-0">
                {/* Avatar Upload */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 ring-2 ring-primary/10">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <input
                      type="file"
                      id="avatar"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("avatar")?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Upload Photo
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      {...register("full_name")}
                      placeholder="Enter full name"
                    />
                    {errors.full_name && (
                      <p className="text-xs text-destructive">{errors.full_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      {...register("date_of_birth")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={watch("gender") || ""}
                      onValueChange={(value) => setValue("gender", value)}
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

                  <div className="space-y-2">
                    <Label htmlFor="blood_group">Blood Group</Label>
                    <Select
                      value={watch("blood_group") || ""}
                      onValueChange={(value) => setValue("blood_group", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      {...register("phone")}
                      placeholder="+1 234 567 8900"
                    />
                    {errors.phone && (
                      <p className="text-xs text-destructive">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="patient@example.com"
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    {...register("address")}
                    placeholder="Enter full address"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profession">Profession</Label>
                  <Input
                    id="profession"
                    {...register("profession")}
                    placeholder="e.g. Teacher, Engineer"
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-destructive" />
                    Emergency Contact
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_name">Contact Name</Label>
                      <Input
                        id="emergency_contact_name"
                        {...register("emergency_contact_name")}
                        placeholder="Emergency contact name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                      <Input
                        id="emergency_contact_phone"
                        {...register("emergency_contact_phone")}
                        placeholder="Emergency contact phone"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="medical" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea
                    id="allergies"
                    {...register("allergies")}
                    placeholder="List allergies separated by commas (e.g., Penicillin, Latex, Peanuts)"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_medications">Current Medications</Label>
                  <Textarea
                    id="current_medications"
                    {...register("current_medications")}
                    placeholder="List current medications"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medical_history">Medical History</Label>
                  <Textarea
                    id="medical_history"
                    {...register("medical_history")}
                    placeholder="Past diseases, surgeries, conditions..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dental_history">Dental History</Label>
                  <Textarea
                    id="dental_history"
                    {...register("dental_history")}
                    placeholder="Previous dental treatments, issues..."
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="other" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    {...register("notes")}
                    placeholder="Any additional notes about this patient..."
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    These notes are only visible to clinic staff.
                  </p>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditPatientModal;
