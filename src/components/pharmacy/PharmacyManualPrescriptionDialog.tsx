import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { FacilityPatientSelector, type SelectedPatient } from "@/components/patient/FacilityPatientSelector";

type RxItem = {
  medication_name: string;
  dosage: string;
  frequency: string;
  quantity: number;
  unit: string;
  instructions: string;
  substitutions_allowed: boolean;
};

export function PharmacyManualPrescriptionDialog({
  open,
  onOpenChange,
  pharmacyId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pharmacyId: string;
  onCreated?: () => void;
}) {
  const [patient, setPatient] = useState<SelectedPatient | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<RxItem[]>([
    {
      medication_name: "",
      dosage: "",
      frequency: "",
      quantity: 1,
      unit: "tablets",
      instructions: "",
      substitutions_allowed: true,
    },
  ]);

  const canSave = useMemo(() => {
    if (!patient) return false;
    if (items.length === 0) return false;
    return items.every((i) => i.medication_name.trim() && i.dosage.trim() && i.frequency.trim() && i.quantity > 0);
  }, [patient, items]);

  const reset = () => {
    setPatient(null);
    setNotes("");
    setItems([
      { medication_name: "", dosage: "", frequency: "", quantity: 1, unit: "tablets", instructions: "", substitutions_allowed: true },
    ]);
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { medication_name: "", dosage: "", frequency: "", quantity: 1, unit: "tablets", instructions: "", substitutions_allowed: true },
    ]);
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, patch: Partial<RxItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const create = async () => {
    if (!pharmacyId) return toast.error("Missing pharmacy");
    if (!canSave) return toast.error("Fill patient + all medication fields");

    setSaving(true);
    try {
      const rxPayload: any = {
        pharmacy_id: pharmacyId,
        status: "pending",
        notes: notes || null,
        refills_remaining: 0,
        refills_total: 0,
      };

      if (patient!.kind === "registered") {
        rxPayload.patient_id = patient!.patient_id;
        rxPayload.patient_name = patient!.full_name;
        rxPayload.patient_phone = patient!.phone;
        rxPayload.patient_email = patient!.email;
      } else {
        rxPayload.facility_patient_id = patient!.facility_patient_id;
        rxPayload.patient_name = patient!.full_name;
        rxPayload.patient_phone = patient!.phone;
        rxPayload.patient_email = patient!.email;
      }

      const { data: rx, error: rxErr } = await supabase
        .from("prescriptions")
        .insert(rxPayload)
        .select("*")
        .single();

      if (rxErr) throw rxErr;

      const itemPayload = items.map((i) => ({
        prescription_id: rx.id,
        medication_name: i.medication_name.trim(),
        medication_code: null,
        dosage: i.dosage.trim(),
        frequency: i.frequency.trim(),
        quantity: Number(i.quantity),
        unit: i.unit || "tablets",
        instructions: i.instructions || null,
        substitutions_allowed: i.substitutions_allowed,
      }));

      const { error: itemsErr } = await supabase.from("prescription_items").insert(itemPayload);
      if (itemsErr) throw itemsErr;

      toast.success("Manual prescription created");
      onCreated?.();
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create prescription");
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
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>New manual prescription</DialogTitle>
          <DialogDescription>
            Create a prescription for a registered patient or a walk-in patient (no account required).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Patient</CardTitle>
              </CardHeader>
              <CardContent>
                <FacilityPatientSelector
                  facilityType="pharmacy"
                  facilityId={pharmacyId}
                  value={patient}
                  onChange={setPatient}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes (optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Pharmacist notes, insurance info, etc."
                  className="min-h-[120px]"
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Medications</CardTitle>
                <Button variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add medication
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((it, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">Item #{idx + 1}</div>
                      {items.length > 1 ? (
                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Medication name</Label>
                        <Input
                          value={it.medication_name}
                          onChange={(e) => updateItem(idx, { medication_name: e.target.value })}
                          placeholder="e.g. Amoxicillin"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Dosage</Label>
                        <Input
                          value={it.dosage}
                          onChange={(e) => updateItem(idx, { dosage: e.target.value })}
                          placeholder="e.g. 500mg"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Frequency</Label>
                        <Input
                          value={it.frequency}
                          onChange={(e) => updateItem(idx, { frequency: e.target.value })}
                          placeholder="e.g. 3x/day"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Qty</Label>
                          <Input
                            type="number"
                            value={it.quantity}
                            onChange={(e) => updateItem(idx, { quantity: Number(e.target.value || 0) })}
                            min={1}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Unit</Label>
                          <Input
                            value={it.unit}
                            onChange={(e) => updateItem(idx, { unit: e.target.value })}
                            placeholder="tablets"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <Label>Instructions (optional)</Label>
                        <Input
                          value={it.instructions}
                          onChange={(e) => updateItem(idx, { instructions: e.target.value })}
                          placeholder="e.g. after meals"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button onClick={create} disabled={!canSave || saving} className="w-full">
                  {saving ? "Creating..." : "Create prescription"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
