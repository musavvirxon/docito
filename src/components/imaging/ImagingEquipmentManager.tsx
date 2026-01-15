// File: src/components/imaging/ImagingEquipmentManager.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";

type EquipmentStatus = "active" | "maintenance" | "offline" | "retired";

type Equipment = {
  id: string;
  imaging_center_id: string;
  name: string;
  modality: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  status: EquipmentStatus;
  capacity_per_day: number;
  scan_types: string[];
  created_at: string;
  updated_at: string;
};

interface Props {
  centerId: string;
}

const STATUSES: EquipmentStatus[] = ["active", "maintenance", "offline", "retired"];
const MODALITIES = ["MRI", "CT", "X-ray", "Ultrasound", "Mammography", "PET", "Other"];

function statusBadge(status: EquipmentStatus) {
  const cls =
    status === "active"
      ? "bg-green-500/10 text-green-600 border-green-500/20"
      : status === "maintenance"
        ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
        : status === "offline"
          ? "bg-red-500/10 text-red-600 border-red-500/20"
          : "bg-gray-500/10 text-gray-700 border-gray-500/20";
  return <Badge className={cls}>{status}</Badge>;
}

export default function ImagingEquipmentManager({ centerId }: Props) {
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [items, setItems] = useState<Equipment[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);

  const schemaReloadAttemptedRef = useRef(false);

  const [form, setForm] = useState({
    name: "",
    modality: "MRI",
    manufacturer: "",
    model: "",
    serial_number: "",
    status: "active" as EquipmentStatus,
    capacity_per_day: 0,
    scan_types: "",
  });

  const reloadSchemaOnce = async () => {
    if (schemaReloadAttemptedRef.current) return false;
    schemaReloadAttemptedRef.current = true;

    try {
      const { data, error } = await supabase.functions.invoke("pgrst-reload", { body: {} });
      if (error) throw error;
      if ((data as any)?.ok) return true;
      return false;
    } catch {
      return false;
    }
  };

  const load = async () => {
    if (!centerId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("imaging-equipment", {
        body: { centerId, action: "list" },
      });
      if (error) throw error;

      const avail = Boolean((data as any)?.available ?? true);
      setAvailable(avail);
      setItems(((data as any)?.equipment ?? []) as Equipment[]);

      if (!avail) {
        toast.message("Equipment storage not ready yet", { description: "Attempting schema reload…" });
        const reloaded = await reloadSchemaOnce();
        if (reloaded) {
          const retry = await supabase.functions.invoke("imaging-equipment", {
            body: { centerId, action: "list" },
          });
          if (!retry.error) {
            const retryAvail = Boolean((retry.data as any)?.available ?? true);
            setAvailable(retryAvail);
            setItems(((retry.data as any)?.equipment ?? []) as Equipment[]);
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load equipment");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    schemaReloadAttemptedRef.current = false;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((x) => (x.name || "").toLowerCase().includes(q) || (x.modality || "").toLowerCase().includes(q));
  }, [items, query]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      modality: "MRI",
      manufacturer: "",
      model: "",
      serial_number: "",
      status: "active",
      capacity_per_day: 0,
      scan_types: "",
    });
    setOpen(true);
  };

  const openEdit = (e: Equipment) => {
    setEditing(e);
    setForm({
      name: e.name ?? "",
      modality: e.modality ?? "Other",
      manufacturer: e.manufacturer ?? "",
      model: e.model ?? "",
      serial_number: e.serial_number ?? "",
      status: e.status ?? "active",
      capacity_per_day: Number(e.capacity_per_day ?? 0),
      scan_types: (e.scan_types ?? []).join(", "),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!centerId) return;
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.modality.trim()) return toast.error("Modality is required");

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("imaging-equipment", {
        body: {
          centerId,
          action: "upsert",
          equipment: {
            id: editing?.id,
            name: form.name.trim(),
            modality: form.modality.trim(),
            manufacturer: form.manufacturer.trim() || null,
            model: form.model.trim() || null,
            serial_number: form.serial_number.trim() || null,
            status: form.status,
            capacity_per_day: Number(form.capacity_per_day || 0),
            scan_types: form.scan_types
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          },
        },
      });

      if (error) throw error;

      const avail = Boolean((data as any)?.available ?? true);
      setAvailable(avail);

      if (!avail) {
        toast.message("Equipment storage not ready yet", { description: "Attempting schema reload…" });
        const reloaded = await reloadSchemaOnce();
        if (reloaded) {
          const retry = await supabase.functions.invoke("imaging-equipment", {
            body: {
              centerId,
              action: "upsert",
              equipment: {
                id: editing?.id,
                name: form.name.trim(),
                modality: form.modality.trim(),
                manufacturer: form.manufacturer.trim() || null,
                model: form.model.trim() || null,
                serial_number: form.serial_number.trim() || null,
                status: form.status,
                capacity_per_day: Number(form.capacity_per_day || 0),
                scan_types: form.scan_types
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              },
            },
          });

          if (retry.error) throw retry.error;

          const retryAvail = Boolean((retry.data as any)?.available ?? true);
          setAvailable(retryAvail);

          if (retryAvail) toast.success(editing ? "Equipment updated" : "Equipment added");
          else toast.message("Equipment still syncing", { description: "Try again in a few seconds." });
        } else {
          toast.message("Equipment still syncing", { description: "Try again in a few seconds." });
        }
      } else {
        toast.success(editing ? "Equipment updated" : "Equipment added");
      }

      setOpen(false);
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save equipment");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!centerId) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("imaging-equipment", {
        body: { centerId, action: "delete", id },
      });
      if (error) throw error;

      const avail = Boolean((data as any)?.available ?? true);
      setAvailable(avail);

      if (!avail) {
        toast.message("Equipment storage not ready yet", { description: "Attempting schema reload…" });
        const reloaded = await reloadSchemaOnce();
        if (reloaded) {
          const retry = await supabase.functions.invoke("imaging-equipment", {
            body: { centerId, action: "delete", id },
          });
          if (retry.error) throw retry.error;

          const retryAvail = Boolean((retry.data as any)?.available ?? true);
          setAvailable(retryAvail);

          if (retryAvail) toast.success("Equipment removed");
          else toast.message("Delete still syncing", { description: "Try again in a few seconds." });
        } else {
          toast.message("Delete still syncing", { description: "Try again in a few seconds." });
        }
      } else {
        toast.success("Equipment removed");
      }

      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to delete equipment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle>Equipment</CardTitle>
            <CardDescription>
              Manage scanners and capacity{!available ? " (storage syncing…)" : ""}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="w-full md:w-64">
              <Input placeholder="Search equipment..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Button variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
            <Button onClick={openCreate} disabled={saving}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Modality</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Capacity/day</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{e.modality}</TableCell>
                    <TableCell>{statusBadge(e.status)}</TableCell>
                    <TableCell className="text-right">{e.capacity_per_day ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => remove(e.id)} disabled={saving}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      No equipment found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Equipment" : "Add Equipment"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Modality</Label>
              <Select value={form.modality} onValueChange={(v) => setForm((s) => ({ ...s, modality: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODALITIES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: EquipmentStatus) => setForm((s) => ({ ...s, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Manufacturer</Label>
              <Input value={form.manufacturer} onChange={(e) => setForm((s) => ({ ...s, manufacturer: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Model</Label>
              <Input value={form.model} onChange={(e) => setForm((s) => ({ ...s, model: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input value={form.serial_number} onChange={(e) => setForm((s) => ({ ...s, serial_number: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Capacity per day</Label>
              <Input
                type="number"
                value={String(form.capacity_per_day)}
                onChange={(e) => setForm((s) => ({ ...s, capacity_per_day: Number(e.target.value) }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Scan types (comma-separated)</Label>
              <Input value={form.scan_types} onChange={(e) => setForm((s) => ({ ...s, scan_types: e.target.value }))} placeholder="Brain, Chest, Abdomen..." />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
