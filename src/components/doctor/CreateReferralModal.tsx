import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileText, User, Pill, FlaskConical, Scan, Search, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";

interface CreateReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  onSuccess?: () => void;
}

type ReferralType = "doctor" | "pharmacy" | "lab" | "imaging_center";

interface ReferralTarget {
  id: string;
  name: string;
  type: string;
  specialty?: string;
  address?: string;
}

interface PatientOption {
  id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
}

const CreateReferralModal = ({ isOpen, onClose, doctorId, onSuccess }: CreateReferralModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [referralType, setReferralType] = useState<ReferralType>("doctor");

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ReferralTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<ReferralTarget | null>(null);

  const [reason, setReason] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [priority, setPriority] = useState<"routine" | "urgent" | "stat">("routine");

  useEffect(() => {
    if (isOpen) {
      fetchPatients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, doctorId]);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchTargets();
    } else {
      setSearchResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, referralType]);

  /**
   * NOTE: Referrals require a registered patient (auth.users / profiles).
   * doctor_patients are doctor-added records and don't map to auth.users,
   * so they can't be used for referrals (FK on referrals.patient_id).
   */
  const fetchPatients = async () => {
    try {
      // 1) Find distinct registered patients from this doctor's appointments
      const { data: appts, error: apptErr } = await supabase
        .from("appointments")
        .select("patient_id")
        .eq("doctor_id", doctorId)
        .not("patient_id", "is", null);

      if (apptErr) throw apptErr;

      const patientIds = Array.from(
        new Set((appts || []).map((a: any) => a.patient_id).filter(Boolean))
      ) as string[];

      if (patientIds.length === 0) {
        setPatients([]);
        return;
      }

      // 2) Pull patient display info
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, full_name, phone, email")
        .in("id", patientIds)
        .order("full_name");

      if (profErr) throw profErr;

      setPatients((profiles || []) as PatientOption[]);
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  const searchTargets = async () => {
    setSearchLoading(true);
    try {
      let results: ReferralTarget[] = [];

      switch (referralType) {
        case "doctor": {
          const { data: doctors } = await supabase
            .from("doctor_profiles_view")
            .select("id, full_name, specialty, practice_address")
            .ilike("full_name", `%${searchTerm}%`)
            .neq("id", doctorId)
            .limit(10);

          results = (doctors || []).map((d: any) => ({
            id: d.id,
            name: d.full_name || "Unknown Doctor",
            type: "doctor",
            specialty: d.specialty,
            address: d.practice_address,
          }));
          break;
        }

        case "pharmacy": {
          const { data: pharmacies } = await supabase
            .from("pharmacies")
            .select("id, name, address, city")
            .ilike("name", `%${searchTerm}%`)
            .limit(10);

          results = (pharmacies || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            type: "pharmacy",
            address: p.address ? `${p.address}, ${p.city}` : p.city || "",
          }));
          break;
        }

        case "lab": {
          const { data: labs } = await supabase
            .from("lab_centers")
            .select("id, name, address, city")
            .ilike("name", `%${searchTerm}%`)
            .eq("status", "active")
            .limit(10);

          results = (labs || []).map((l: any) => ({
            id: l.id,
            name: l.name,
            type: "lab",
            address: `${l.address}, ${l.city}`,
          }));
          break;
        }

        case "imaging_center": {
          const { data: imaging } = await supabase
            .from("imaging_centers")
            .select("id, name, address, city")
            .ilike("name", `%${searchTerm}%`)
            .eq("status", "active")
            .limit(10);

          results = (imaging || []).map((i: any) => ({
            id: i.id,
            name: i.name,
            type: "imaging_center",
            address: `${i.address}, ${i.city}`,
          }));
          break;
        }
      }

      setSearchResults(results);
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in to create a referral");
      return;
    }

    if (!selectedPatientId || !selectedTarget || !reason) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const referralTypeEnum =
        referralType === "doctor"
          ? "specialist_referral"
          : referralType === "lab"
            ? "lab_test"
            : referralType === "imaging_center"
              ? "imaging_study"
              : "prescription_fulfillment";

      const receiverTypeEnum =
        referralType === "doctor"
          ? "doctor"
          : referralType === "lab"
            ? "lab"
            : referralType === "imaging_center"
              ? "imaging_center"
              : "pharmacy";

      const { error } = await supabase.from("referrals").insert({
        patient_id: selectedPatientId,
        referrer_type: "doctor",
        referrer_entity_id: doctorId,
        referrer_user_id: user.id,
        receiver_type: receiverTypeEnum as any,
        receiver_entity_id: selectedTarget.id,
        referral_type_enum: referralTypeEnum as any,
        priority: priority as any,
        status: "sent",
        sent_at: new Date().toISOString(),
        reason,
        clinical_notes: clinicalNotes || null,
        valid_from: new Date().toISOString().slice(0, 10),
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        estimated_duration_minutes: referralType === "lab" ? 15 : 30,
        attachments: [],
      } as any);

      if (error) throw error;

      toast.success(`Referral sent to ${selectedTarget.name}`);
      onSuccess?.();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error("Error creating referral:", error);
      toast.error(error.message || "Failed to create referral");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPatientId("");
    setSearchTerm("");
    setSearchResults([]);
    setSelectedTarget(null);
    setReason("");
    setClinicalNotes("");
    setPriority("routine");
    setReferralType("doctor");
  };

  const getIcon = (type: ReferralType) => {
    switch (type) {
      case "doctor":
        return <User className="w-4 h-4" />;
      case "pharmacy":
        return <Pill className="w-4 h-4" />;
      case "lab":
        return <FlaskConical className="w-4 h-4" />;
      case "imaging_center":
        return <Scan className="w-4 h-4" />;
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Create New Referral
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label>Refer To</Label>
            <Tabs
              value={referralType}
              onValueChange={(v) => {
                setReferralType(v as ReferralType);
                setSearchTerm("");
                setSearchResults([]);
                setSelectedTarget(null);
              }}
            >
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="doctor" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Doctor
                </TabsTrigger>
                <TabsTrigger value="pharmacy" className="flex items-center gap-2">
                  <Pill className="w-4 h-4" />
                  Pharmacy
                </TabsTrigger>
                <TabsTrigger value="lab" className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4" />
                  Lab
                </TabsTrigger>
                <TabsTrigger value="imaging_center" className="flex items-center gap-2">
                  <Scan className="w-4 h-4" />
                  Imaging
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label>Select Patient (registered) *</Label>
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.full_name} {patient.phone && `(${patient.phone})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {patients.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No registered patients found for this doctor yet. Referrals can only be created for registered patients.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Search {referralType.charAt(0).toUpperCase() + referralType.slice(1)} *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={`Search for a ${referralType}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
              )}
            </div>

            {searchResults.length > 0 && !selectedTarget && (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => {
                      setSelectedTarget(result);
                      setSearchTerm(result.name);
                    }}
                    className="w-full p-3 text-left hover:bg-muted/50 border-b last:border-b-0 flex items-start gap-3"
                  >
                    <div className="mt-0.5">{getIcon(referralType)}</div>
                    <div>
                      <p className="font-medium">{result.name}</p>
                      {result.specialty && <p className="text-sm text-muted-foreground">{result.specialty}</p>}
                      {result.address && <p className="text-xs text-muted-foreground">{result.address}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedTarget && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getIcon(referralType)}
                  <div>
                    <p className="font-medium">{selectedTarget.name}</p>
                    {selectedTarget.specialty && (
                      <p className="text-sm text-muted-foreground">{selectedTarget.specialty}</p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTarget(null);
                    setSearchTerm("");
                  }}
                >
                  Change
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Priority</Label>
            <RadioGroup value={priority} onValueChange={(v) => setPriority(v as any)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="routine" id="routine" />
                <Label htmlFor="routine" className="font-normal cursor-pointer">
                  Routine
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="urgent" id="urgent" />
                <Label htmlFor="urgent" className="font-normal cursor-pointer text-amber-600">
                  Urgent
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="stat" id="stat" />
                <Label htmlFor="stat" className="font-normal cursor-pointer text-red-600">
                  STAT
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Referral *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the reason for this referral..."
              className="min-h-[80px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinicalNotes">Clinical Notes (Optional)</Label>
            <Textarea
              id="clinicalNotes"
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Additional clinical information, history, test results..."
              className="min-h-[100px]"
            />
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !selectedPatientId || !selectedTarget || !reason}>
              {loading ? "Sending..." : "Send Referral"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateReferralModal;
