import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type FacilityType = "lab" | "pharmacy" | "imaging_center";

export type FacilityPatientRow = {
  id: string;
  facility_type: FacilityType;
  facility_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
};

export function CreateFacilityPatientModal({
  open,
  onOpenChange,
  facilityType,
  facilityId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityType: FacilityType;
  facilityId: string;
  onCreated: (patient: FacilityPatientRow) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");

  const reset = () => {
    setFullName("");
    setPhone("");
    setEmail("");
    setDob("");
  };

  const create = async () => {
    if (!fullName.trim()) return toast.error("Full name is required");
    if (!phone.trim()) return toast.error("Phone is required");

    setSaving(true);
    try {
      const payload = {
        facility_type: facilityType,
        facility_id: facilityId,
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() ? email.trim() : null,
        date_of_birth: dob ? dob : null,
      };

      const { data, error } = await supabase.from("facility_patients").insert(payload).select("*").single();

      if (error) throw error;

      toast.success("Walk-in patient created");
      onCreated(data as any);
      reset();
      onOpenChange(false);
    } catch (e: any) {
      // handles UNIQUE(facility_type, facility_id, phone)
      toast.error(e?.message ?? "Failed to create patient");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add walk-in patient</DialogTitle>
          <DialogDescription>
            This patient is usable immediately for manual orders, even without a platform account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jane Doe" />
          </div>

          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 ..." />
          </div>

          <div className="space-y-1">
            <Label>Email (optional)</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="patient@email.com" />
          </div>

          <div className="space-y-1">
            <Label>Date of birth (optional)</Label>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={create} disabled={saving}>
            {saving ? "Creating..." : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
