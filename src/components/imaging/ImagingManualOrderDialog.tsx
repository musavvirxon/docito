import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { FacilityPatientSelector, type SelectedPatient } from "@/components/patient/FacilityPatientSelector";

export function ImagingManualOrderDialog({
  open,
  onOpenChange,
  imagingCenterId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imagingCenterId: string;
  onCreated?: () => void;
}) {
  const [patient, setPatient] = useState<SelectedPatient | null>(null);
  const [reason, setReason] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [priority, setPriority] = useState<"routine" | "urgent" | "stat">("routine");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setPatient(null);
    setReason("");
    setClinicalNotes("");
    setPriority("routine");
  };

  const create = async () => {
    if (!imagingCenterId) return toast.error("Missing imaging center");
    if (!patient) return toast.error("Select a patient");
    if (!reason.trim()) return toast.error("Reason is required");

    setSaving(true);
    try {
      // valid_until: 30 days from now
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      const payload: any = {
        // patient (registered or walk-in)
        patient_id: null,
        facility_patient_id: null,

        patient_name: patient.full_name,
        patient_phone: patient.kind === "registered" ? (patient.phone ?? null) : patient.phone,
        patient_email: patient.email ?? null,

        // referrer = imaging_center (self) so it shows in outgoing too
        referrer_type: "imaging_center",
        referrer_entity_id: imagingCenterId,
        referrer_user_id: (await supabase.auth.getUser()).data.user?.id,

        // receiver = imaging_center (this center) so it appears in incoming queue
        receiver_type: "imaging_center",
        receiver_entity_id: imagingCenterId,

        referral_type_enum: "imaging_study",
        priority,
        status: "sent",

        reason: reason.trim(),
        clinical_notes: clinicalNotes || null,

        valid_from: new Date().toISOString(),
        valid_until: validUntil.toISOString(),
        estimated_duration_minutes: 30,
      };

      if (patient.kind === "registered") payload.patient_id = patient.patient_id;
      else payload.facility_patient_id = patient.facility_patient_id;

      const { error } = await supabase.from("referrals").insert(payload);
      if (error) throw error;

      toast.success("Imaging walk-in order created");
      onCreated?.();
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create imaging order");
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>New walk-in imaging order</DialogTitle>
          <DialogDescription>
            Creates an incoming imaging referral/order for this center (registered or walk-in patient).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient</CardTitle>
            </CardHeader>
            <CardContent>
              <FacilityPatientSelector
                facilityType="imaging_center"
                facilityId={imagingCenterId}
                value={patient}
                onChange={setPatient}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Priority</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={priority === "routine" ? "default" : "outline"} onClick={() => setPriority("routine")}>
                    Routine
                  </Button>
                  <Button type="button" variant={priority === "urgent" ? "default" : "outline"} onClick={() => setPriority("urgent")}>
                    Urgent
                  </Button>
                  <Button type="button" variant={priority === "stat" ? "default" : "outline"} onClick={() => setPriority("stat")}>
                    STAT
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Reason</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Suspected fracture, head CT..." />
              </div>

              <div className="space-y-1">
                <Label>Clinical notes (optional)</Label>
                <Textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Symptoms, contraindications, special instructions..." />
              </div>

              <Button onClick={create} disabled={saving} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {saving ? "Creating..." : "Create imaging order"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
