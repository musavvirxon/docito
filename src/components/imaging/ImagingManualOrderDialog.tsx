import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { validatePhone } from "@/lib/phone/phone";
import { logSession } from "@/lib/debug/authDebug";

export function ImagingManualOrderDialog({
  open,
  onOpenChange,
  imagingCenterId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  imagingCenterId: string;
  onCreated?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientDob, setPatientDob] = useState("");

  const [modality, setModality] = useState<"xray" | "ct" | "mri" | "ultrasound" | "mammography" | "other">("xray");
  const [studyName, setStudyName] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [contrast, setContrast] = useState<"no" | "yes">("no");

  const [priority, setPriority] = useState<"routine" | "urgent" | "stat">("routine");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredSlot, setPreferredSlot] = useState("");
  const [reason, setReason] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(false);
    setPatientName("");
    setPatientPhone("");
    setPatientEmail("");
    setPatientDob("");
    setModality("xray");
    setStudyName("");
    setBodyPart("");
    setContrast("no");
    setPriority("routine");
    setPreferredDate("");
    setPreferredSlot("");
    setReason("");
    setClinicalNotes("");
  }, [open]);

  const validate = () => {
    if (!imagingCenterId) return "Missing imaging center";
    if (!patientName.trim()) return "Walk-in patient name is required";

    const phoneCheck = validatePhone(patientPhone);
    if (!phoneCheck.ok) return phoneCheck.reason || "Invalid phone";

    if (!studyName.trim()) return "Study name is required (e.g. Chest X-Ray)";
    return null;
  };

  const handleCreate = async () => {
    const err = validate();
    if (err) return toast.error(err);

    setLoading(true);
    try {
      await logSession("IMAGING_DASHBOARD_MANUAL_ORDER_CREATE");

      const phone = validatePhone(patientPhone).normalized;

      const { data, error } = await supabase.functions.invoke("imaging-create-order", {
        body: {
          centerId: imagingCenterId,
          patient: {
            full_name: patientName.trim(),
            phone,
            email: patientEmail.trim() || null,
            date_of_birth: patientDob || null,
          },
          study: {
            modality,
            name: studyName.trim(),
            body_part: bodyPart.trim() || null,
            contrast: contrast === "yes",
          },
          priority,
          preferred_date: preferredDate || null,
          preferred_time_slot: preferredSlot.trim() || null,
          reason: reason.trim() || studyName.trim(),
          clinical_notes: clinicalNotes.trim() || null,
        },
      });

      if (error) {
        const ctx = (error as any)?.context ? JSON.stringify((error as any).context) : "";
        throw new Error(`${error.message}${ctx ? ` | ${ctx}` : ""}`);
      }

      if (!data?.ok) {
        const meta = data?.meta ? ` | ${JSON.stringify(data.meta)}` : "";
        throw new Error(`${data?.error || "Failed to create imaging order"}${meta}`);
      }

      if (data?.stateWarning) {
        toast.warning(`Order created, but state tracking failed: ${JSON.stringify(data.stateWarning)}`);
      }

      toast.success(`Manual imaging order created (${data.referralNumber || "REF"})`);
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create imaging order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Manual Imaging Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3 border rounded-lg p-4">
            <div className="text-sm font-semibold">Patient (Walk-in)</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Full name *</Label>
                <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Full name" />
              </div>

              <PhoneInput value={patientPhone} onChange={setPatientPhone} />

              <div className="space-y-1">
                <Label>Email (optional)</Label>
                <Input
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-1">
                <Label>Date of birth (optional)</Label>
                <Input type="date" value={patientDob} onChange={(e) => setPatientDob(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-3 border rounded-lg p-4">
            <div className="text-sm font-semibold">Study</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Modality</Label>
                <Select value={modality} onValueChange={(v) => setModality(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Modality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xray">X-Ray</SelectItem>
                    <SelectItem value="ct">CT</SelectItem>
                    <SelectItem value="mri">MRI</SelectItem>
                    <SelectItem value="ultrasound">Ultrasound</SelectItem>
                    <SelectItem value="mammography">Mammography</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Study name *</Label>
                <Input
                  value={studyName}
                  onChange={(e) => setStudyName(e.target.value)}
                  placeholder="Chest X-Ray, Brain MRI..."
                />
              </div>

              <div className="space-y-1">
                <Label>Body part (optional)</Label>
                <Input value={bodyPart} onChange={(e) => setBodyPart(e.target.value)} placeholder="Chest, Brain, Knee..." />
              </div>

              <div className="space-y-1">
                <Label>Contrast</Label>
                <Select value={contrast} onValueChange={(v) => setContrast(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Contrast" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-3 border rounded-lg p-4">
            <div className="text-sm font-semibold">Scheduling & Notes</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Preferred date (optional)</Label>
                <Input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label>Preferred time slot (optional)</Label>
                <Input
                  value={preferredSlot}
                  onChange={(e) => setPreferredSlot(e.target.value)}
                  placeholder="e.g. 09:00-11:00"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Reason (optional)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for study (defaults to study name)"
              />
            </div>

            <div className="space-y-1">
              <Label>Clinical notes (optional)</Label>
              <Textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                rows={3}
                placeholder="Symptoms, suspected diagnosis, instructions..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? "Creating..." : "Create Imaging Order"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
