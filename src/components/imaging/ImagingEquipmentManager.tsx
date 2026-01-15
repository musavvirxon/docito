// File: src/components/imaging/ImagingEquipmentManager.tsx

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Settings, CheckCircle, XCircle, Wrench, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withSchemaReloadRetry } from "@/lib/pgrstSchemaRetry";

type EquipmentStatus = "active" | "maintenance" | "offline" | "retired";

interface Equipment {
  id: string;
  imaging_center_id: string;
  name: string;
  modality: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  installation_date: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  status: EquipmentStatus;
  scan_types: string[];
  capacity_per_day: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  centerId: string;
}

const MODALITIES = ["MRI", "CT", "X-ray", "Ultrasound", "Mammography", "PET", "PET-CT", "Fluoroscopy", "DEXA"];

export default function ImagingEquipmentManager({ centerId }: Props) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    modality: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    installation_date: "",
    capacity_per_day: 20,
  });

  const canSubmit = useMemo(() => Boolean(formData.name.trim() && formData.modality.trim()), [formData.name, formData.modality]);

  useEffect(() => {
    if (centerId) fetchEquipment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId]);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const data = await withSchemaReloadRetry(async () => {
        const { data, error } = await supabase
          .from("imaging_equipment")
          .select("*")
          .eq("imaging_center_id", centerId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        return (data || []) as Equipment[];
      });

      setEquipment(data);
    } catch (e: any) {
      console.error(e);
      // If table truly doesn't exist yet, don't crash the dashboard
      toast.error(e?.message || "Failed to load equipment");
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEquipment = async () => {
    if (!canSubmit) {
      toast.error("Please fill in required fields");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        imaging_center_id: centerId,
        name: formData.name.trim(),
        modality: formData.modality.trim(),
        manufacturer: formData.manufacturer.trim() || null,
        model: formData.model.trim() || null,
        serial_number: formData.serial_number.trim() || null,
        installation_date: formData.installation_date ? formData.installation_date : null,
        capacity_per_day: Number.isFinite(formData.capacity_per_day) ? formData.capacity_per_day : 0,
      };

      await withSchemaReloadRetry(async () => {
        const { error } = await supabase.from("imaging_equipment").insert(payload);
        if (error) throw error;
      });

      toast.success("Equipment added");
      setDialogOpen(false);
      setFormData({
        name: "",
        modality: "",
        manufacturer: "",
        model: "",
        serial_number: "",
        installation_date: "",
        capacity_per_day: 20,
      });
      await fetchEquipment();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to add equipment");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: EquipmentStatus) => {
    try {
      await withSchemaReloadRetry(async () => {
        const { error } = await supabase.from("imaging_equipment").update({ status }).eq("id", id);
        if (error) throw error;
      });

      setEquipment((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
      toast.success("Status updated");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update status");
    }
  };

  const getStatusBadge = (status: EquipmentStatus) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case "maintenance":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <Wrench className="w-3 h-3 mr-1" />
            Maintenance
          </Badge>
        );
      case "offline":
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Offline
          </Badge>
        );
      case "retired":
        return <Badge variant="secondary">Retired</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Equipment Management</CardTitle>
          <CardDescription>Manage imaging equipment and modalities</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchEquipment}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Equipment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Equipment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Equipment Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., MRI Scanner - Room A" />
                </div>

                <div className="space-y-2">
                  <Label>Modality *</Label>
                  <Select value={formData.modality} onValueChange={(v) => setFormData({ ...formData, modality: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select modality" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODALITIES.map((mod) => (
                        <SelectItem key={mod} value={mod}>
                          {mod}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Manufacturer</Label>
                    <Input value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} placeholder="e.g., Siemens" />
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} placeholder="e.g., MAGNETOM" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Serial Number</Label>
                    <Input value={formData.serial_number} onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Installation Date</Label>
                    <Input type="date" value={formData.installation_date} onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Daily Capacity (scans)</Label>
                  <Input
                    type="number"
                    value={formData.capacity_per_day}
                    onChange={(e) => setFormData({ ...formData, capacity_per_day: parseInt(e.target.value || "0", 10) })}
                    min={0}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddEquipment} disabled={!canSubmit || saving}>
                    {saving ? "Adding..." : "Add Equipment"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {equipment.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No equipment registered yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>Modality</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Capacity/day</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((eq) => (
                <TableRow key={eq.id}>
                  <TableCell>
                    <div className="font-medium">{eq.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {eq.manufacturer || "—"} {eq.model ? `• ${eq.model}` : ""} {eq.serial_number ? `• SN: ${eq.serial_number}` : ""}
                    </div>
                  </TableCell>
                  <TableCell>{eq.modality}</TableCell>
                  <TableCell>{getStatusBadge(eq.status)}</TableCell>
                  <TableCell className="text-right">{eq.capacity_per_day ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Select value={eq.status} onValueChange={(v) => updateStatus(eq.id, v as EquipmentStatus)}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="offline">Offline</SelectItem>
                          <SelectItem value="retired">Retired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
