import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { validatePhone } from "@/lib/phone/phone";

export type FacilityType = "lab" | "pharmacy" | "imaging_center" | "clinic" | "doctor";

export function CreateFacilityPatientModal({
  open,
  onOpenChange,
  facilityType,
  facilityId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  facilityType: FacilityType;
  facilityId: string;
  onCreated?: (row: any) => void;
}) {
  const sb = supabase as any; // ✅ key fix: bypass wrong generated types

  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState(""); // YYYY-MM-DD

  const phoneCheck = useMemo(() => validatePhone(phone), [phone]);

  const canSubmit =
    fullName.trim().length >= 2 &&
    phoneCheck.ok &&
    facilityId?.length > 0 &&
    !!facilityType;

  const reset = () => {
    setFullName("");
    setPhone("");
    setEmail("");
    setDob("");
  };

  const handleCreate = async () => {
    if (!canSubmit) {
      if (!fullName.trim()) return toast.error("Full name is required");
      if (!phoneCheck.ok) return toast.error(phoneCheck.reason || "Invalid phone");
      return toast.error("Missing facility info");
    }

    setLoading(true);
    try {
      const payload = {
        facility_type: facilityType,
        facility_id: facilityId,
        full_name: fullName.trim(),
        phone: phoneCheck.normalized, // ✅ store normalized
        email: email.trim() || null,
        date_of_birth: dob || null,
      };

      // ✅ works even if facility_patients isn't in generated types
      const { data, error } = await sb
        .from("facility_patients")
        .insert([payload])
        .select("*")
        .single();

      if (error) throw error;

      toast.success("Patient created");
      onCreated?.(data);
      reset();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create patient");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create facility patient</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Full name *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
          </div>

          {/* ✅ phone required + validated */}
          <PhoneInput value={phone} onChange={setPhone} />

          <div className="space-y-1">
            <Label>Email (optional)</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </div>

          <div className="space-y-1">
            <Label>Date of birth (optional)</Label>
            <Input value={dob} onChange={(e) => setDob(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!canSubmit || loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
