// File: src/components/doctor/CreateProcedureDialog.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export type CreatedProcedure = {
  id: string;
  dentist_id: string;
  name: string;
  description?: string | null;
  category: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  is_bookable?: boolean | null;
  is_consultation?: boolean | null;
  created_at: string;
};

export function CreateProcedureDialog({
  open,
  onOpenChange,
  onProcedureCreated,
  doctorId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProcedureCreated: (procedure: CreatedProcedure) => void;
  doctorId: string;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "general",
    duration_minutes: 30,
    price: 0,
    is_active: true,
    is_bookable: true,
  });

  const canSave = useMemo(() => {
    return (
      Boolean(doctorId) &&
      form.name.trim().length > 0 &&
      Number.isFinite(form.duration_minutes) &&
      form.duration_minutes > 0
    );
  }, [doctorId, form.duration_minutes, form.name]);

  useEffect(() => {
    if (!open) {
      setSaving(false);
      setForm({
        name: "",
        description: "",
        category: "general",
        duration_minutes: 30,
        price: 0,
        is_active: true,
        is_bookable: true,
      });
    }
  }, [open]);

  const handleSave = async () => {
    if (!canSave) return;

    try {
      setSaving(true);

      const payload = {
        dentist_id: doctorId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || "general",
        type: "single_visit",
        duration_minutes: Number(form.duration_minutes || 0),
        price: Number(form.price || 0),
        default_cost: Number(form.price || 0),
        is_active: Boolean(form.is_active),
        is_bookable: Boolean(form.is_bookable),
        is_consultation: false,
      };

      const { data, error } = await (supabase as any)
        .from("procedures")
        .insert(payload)
        .select("id, dentist_id, name, description, category, duration_minutes, price, is_active, is_bookable, is_consultation, created_at")
        .single();

      if (error) throw error;

      const created: CreatedProcedure = {
        id: data.id,
        dentist_id: data.dentist_id,
        name: data.name,
        description: data.description,
        category: data.category,
        duration_minutes: Number(data.duration_minutes || 0),
        price: Number(data.price || 0),
        is_active: Boolean(data.is_active),
        is_bookable: data.is_bookable,
        is_consultation: data.is_consultation,
        created_at: data.created_at,
      };

      onProcedureCreated(created);
      onOpenChange(false);
    } catch (e: any) {
      console.error("Failed to create procedure", e);
      toast.error(e?.message || "Failed to create procedure");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Procedure</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Teeth Cleaning"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Optional details shown to patients"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                placeholder="general"
              />
            </div>

            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min={5}
                max={600}
                value={form.duration_minutes}
                onChange={(e) => setForm((p) => ({ ...p, duration_minutes: Number(e.target.value || 0) }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Price</Label>
              <Input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: Number(e.target.value || 0) }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Show in your library</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 col-span-2">
              <div>
                <Label>Bookable</Label>
                <p className="text-xs text-muted-foreground">Allow patients to book this procedure</p>
              </div>
              <Switch
                checked={form.is_bookable}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, is_bookable: checked }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave || saving}>
              {saving ? "Saving…" : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
