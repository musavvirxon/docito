// File: src/components/doctor/DoctorProcedureLibrarySection.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, Settings } from "lucide-react";
import { CreateProcedureDialog } from "./CreateProcedureDialog";
import { useDoctorProcedureSettings } from "@/hooks/useDoctorProcedureSettings";

type ProcedureType = {
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

export function DoctorProcedureLibrarySection() {
  const { user } = useAuth();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [procedures, setProcedures] = useState<ProcedureType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<ProcedureType | null>(null);
  const [activeTab, setActiveTab] = useState<"procedures" | "settings">("procedures");

  const {
    doctor: doctorSettings,
    consultationProcedure,
    loading: settingsLoading,
    saving: settingsSaving,
    error: settingsError,
    refresh: refreshSettings,
    save: saveSettings,
  } = useDoctorProcedureSettings();

  const [settingsDraft, setSettingsDraft] = useState({
    consultation_fee: 0 as number,
    accepts_new_patients: true as boolean,
    consultation_duration_minutes: 30 as number,
    consultation_is_active: true as boolean,
    consultation_is_bookable: true as boolean,
  });

  useEffect(() => {
    const fetchDoctorAndProcedures = async () => {
      if (!user) return;

      try {
        setLoading(true);

        const { data: doctorData, error: doctorError } = await supabase
          .from("doctors")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (doctorError) throw doctorError;

        setDoctorId(doctorData.id);

        const { data: proceduresData, error: proceduresError } = await supabase
          .from("procedures")
          .select(
            "id, dentist_id, name, description, category, duration_minutes, price, is_active, is_bookable, is_consultation, created_at",
          )
          .eq("dentist_id", doctorData.id)
          .order("created_at", { ascending: false });

        if (proceduresError) throw proceduresError;

        const rows = (proceduresData || []) as any[];
        const normalized = rows
          .map((procedure) => ({
            ...procedure,
            duration_minutes: Number(procedure.duration_minutes || 0),
            price: Number(procedure.price || 0),
            is_active: Boolean(procedure.is_active),
          }))
          .sort((a, b) => {
            const aC = Boolean(a.is_consultation);
            const bC = Boolean(b.is_consultation);
            if (aC && !bC) return -1;
            if (!aC && bC) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });

        setProcedures(normalized);
      } catch (error: any) {
        console.error("Error fetching doctor procedures:", error);
        toast.error("Failed to load procedures");
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorAndProcedures();
  }, [user]);

  useEffect(() => {
    const fee = Number(doctorSettings?.consultation_fee ?? 0);
    const accepts = doctorSettings?.accepts_new_patients;
    const dur = Number(consultationProcedure?.duration_minutes ?? 30);
    const isActive = Boolean(consultationProcedure?.is_active ?? true);
    const isBookable = Boolean(consultationProcedure?.is_bookable ?? true);

    setSettingsDraft({
      consultation_fee: fee,
      accepts_new_patients: accepts === null || accepts === undefined ? true : Boolean(accepts),
      consultation_duration_minutes: dur,
      consultation_is_active: isActive,
      consultation_is_bookable: isBookable,
    });
  }, [doctorSettings, consultationProcedure]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    procedures.forEach((p) => {
      if (p.category) unique.add(p.category);
    });
    return Array.from(unique).sort();
  }, [procedures]);

  const filteredProcedures = useMemo(() => {
    return procedures.filter((procedure) => {
      const matchesSearch = procedure.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || procedure.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [procedures, searchQuery, selectedCategory]);

  const handleProcedureCreated = (newProcedure: ProcedureType) => {
    setProcedures((prev) => [newProcedure, ...prev]);
    toast.success("Procedure added successfully");
  };

  const handleEditProcedure = (procedure: ProcedureType) => {
    setEditingProcedure(procedure);
    setShowEditDialog(true);
  };

  const handleDeleteProcedure = async (procedureId: string) => {
    if (!confirm("Are you sure you want to delete this procedure?")) return;

    try {
      const { error } = await supabase.from("procedures").delete().eq("id", procedureId);
      if (error) throw error;

      setProcedures((prev) => prev.filter((p) => p.id !== procedureId));
      toast.success("Procedure deleted successfully");
    } catch (error: any) {
      console.error("Error deleting procedure:", error);
      toast.error("Failed to delete procedure");
    }
  };

  const handleSaveProcedureUpdate = async () => {
    if (!editingProcedure) return;

    try {
      const { error } = await supabase
        .from("procedures")
        .update({
          name: editingProcedure.name,
          description: editingProcedure.description,
          category: editingProcedure.category,
          duration_minutes: editingProcedure.duration_minutes,
          price: editingProcedure.price,
          is_active: editingProcedure.is_active,
          is_bookable: editingProcedure.is_bookable ?? true,
        })
        .eq("id", editingProcedure.id);

      if (error) throw error;

      setProcedures((prev) =>
        prev
          .map((p) => (p.id === editingProcedure.id ? editingProcedure : p))
          .sort((a, b) => {
            const aC = Boolean(a.is_consultation);
            const bC = Boolean(b.is_consultation);
            if (aC && !bC) return -1;
            if (!aC && bC) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }),
      );

      if (editingProcedure.is_consultation) {
        await saveSettings({
          consultation_fee: editingProcedure.price,
          consultation_duration_minutes: editingProcedure.duration_minutes,
          consultation_is_active: editingProcedure.is_active,
          consultation_is_bookable: editingProcedure.is_bookable ?? true,
        });
        await refreshSettings();
      }

      toast.success("Procedure updated successfully");
      setShowEditDialog(false);
      setEditingProcedure(null);
    } catch (error: any) {
      console.error("Error updating procedure:", error);
      toast.error("Failed to update procedure");
    }
  };

  const handleSaveDoctorSettings = async () => {
    try {
      await saveSettings({
        consultation_fee: settingsDraft.consultation_fee,
        accepts_new_patients: settingsDraft.accepts_new_patients,
        consultation_duration_minutes: settingsDraft.consultation_duration_minutes,
        consultation_is_active: settingsDraft.consultation_is_active,
        consultation_is_bookable: settingsDraft.consultation_is_bookable,
      });

      if (doctorId) {
        const { data: proceduresData, error: proceduresError } = await supabase
          .from("procedures")
          .select(
            "id, dentist_id, name, description, category, duration_minutes, price, is_active, is_bookable, is_consultation, created_at",
          )
          .eq("dentist_id", doctorId)
          .order("created_at", { ascending: false });

        if (proceduresError) throw proceduresError;

        const rows = (proceduresData || []) as any[];
        const normalized = rows
          .map((procedure) => ({
            ...procedure,
            duration_minutes: Number(procedure.duration_minutes || 0),
            price: Number(procedure.price || 0),
            is_active: Boolean(procedure.is_active),
          }))
          .sort((a, b) => {
            const aC = Boolean(a.is_consultation);
            const bC = Boolean(b.is_consultation);
            if (aC && !bC) return -1;
            if (!aC && bC) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });

        setProcedures(normalized as any);
      }

      toast.success("Settings saved");
    } catch (e: any) {
      console.error("Error saving doctor settings:", e);
      toast.error(e?.message || "Failed to save settings");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">Loading procedures…</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Procedure Library</h2>
          <p className="text-muted-foreground">Manage your procedures and consultation settings</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Procedure
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="procedures">Procedures</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="procedures" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search procedures…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {filteredProcedures.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">No procedures found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredProcedures.map((procedure) => (
                <ProcedureCard
                  key={procedure.id}
                  procedure={procedure}
                  onEdit={handleEditProcedure}
                  onDelete={handleDeleteProcedure}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Consultation Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsLoading ? (
                <div className="text-sm text-muted-foreground">Loading settings…</div>
              ) : settingsError ? (
                <div className="text-sm text-destructive">{settingsError}</div>
              ) : !doctorSettings ? (
                <div className="text-sm text-muted-foreground">Doctor profile not found.</div>
              ) : !doctorSettings.verified ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Your profile must be verified before consultation settings are published.
                  </div>
                  <div className="text-sm text-muted-foreground">
                    You can still set your consultation fee now — a "Consultation" procedure will be created automatically
                    once your profile becomes verified.
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="consultation_fee">Consultation Fee</Label>
                  <Input
                    id="consultation_fee"
                    type="number"
                    min={0}
                    value={settingsDraft.consultation_fee}
                    onChange={(e) =>
                      setSettingsDraft((p) => ({
                        ...p,
                        consultation_fee: Number(e.target.value || 0),
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    This also keeps the "Consultation" procedure price in sync.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consultation_duration">Consultation Duration (minutes)</Label>
                  <Input
                    id="consultation_duration"
                    type="number"
                    min={5}
                    max={600}
                    value={settingsDraft.consultation_duration_minutes}
                    onChange={(e) =>
                      setSettingsDraft((p) => ({
                        ...p,
                        consultation_duration_minutes: Number(e.target.value || 30),
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label>Accept New Patients</Label>
                    <p className="text-xs text-muted-foreground">Control whether patients can book you.</p>
                  </div>
                  <Switch
                    checked={settingsDraft.accepts_new_patients}
                    onCheckedChange={(checked) => setSettingsDraft((p) => ({ ...p, accepts_new_patients: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label>Consultation Active</Label>
                    <p className="text-xs text-muted-foreground">Show consultation as active in your library.</p>
                  </div>
                  <Switch
                    checked={settingsDraft.consultation_is_active}
                    onCheckedChange={(checked) => setSettingsDraft((p) => ({ ...p, consultation_is_active: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4 md:col-span-2">
                  <div>
                    <Label>Consultation Bookable</Label>
                    <p className="text-xs text-muted-foreground">Allow patients to book the consultation procedure.</p>
                  </div>
                  <Switch
                    checked={settingsDraft.consultation_is_bookable}
                    onCheckedChange={(checked) => setSettingsDraft((p) => ({ ...p, consultation_is_bookable: checked }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleSaveDoctorSettings} disabled={settingsSaving}>
                  {settingsSaving ? "Saving…" : "Save Settings"}
                </Button>
                <Button variant="outline" onClick={() => refreshSettings()} disabled={settingsSaving}>
                  Refresh
                </Button>
              </div>

              {consultationProcedure ? (
                <div className="text-xs text-muted-foreground">
                  Linked procedure: <span className="font-mono">{consultationProcedure.id}</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Consultation procedure has not been created yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateProcedureDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onProcedureCreated={handleProcedureCreated}
        doctorId={doctorId || ""}
      />

      <EditProcedureDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        procedure={editingProcedure}
        onChange={setEditingProcedure}
        onSave={handleSaveProcedureUpdate}
      />
    </div>
  );
}

function ProcedureCard({
  procedure,
  onEdit,
  onDelete,
}: {
  procedure: ProcedureType;
  onEdit: (procedure: ProcedureType) => void;
  onDelete: (procedureId: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold">{procedure.name}</h3>
              {procedure.is_consultation ? <Badge>Consultation</Badge> : null}
              {!procedure.is_active ? <Badge variant="secondary">Inactive</Badge> : null}
              {procedure.is_bookable === false ? <Badge variant="outline">Not bookable</Badge> : null}
              <Badge variant="outline">{procedure.category}</Badge>
            </div>

            {procedure.description ? <p className="text-muted-foreground text-sm">{procedure.description}</p> : null}

            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Duration: {procedure.duration_minutes} min</span>
              <span>Price: ${procedure.price}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(procedure)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(procedure.id)}
              disabled={procedure.is_consultation === true}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EditProcedureDialog({
  open,
  onOpenChange,
  procedure,
  onChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  procedure: ProcedureType | null;
  onChange: (procedure: ProcedureType | null) => void;
  onSave: () => void;
}) {
  if (!procedure) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Procedure</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={procedure.name} onChange={(e) => onChange({ ...procedure, name: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={procedure.description || ""}
              onChange={(e) => onChange({ ...procedure, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={procedure.category} onChange={(e) => onChange({ ...procedure, category: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={procedure.duration_minutes}
                onChange={(e) => onChange({ ...procedure, duration_minutes: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label>Price</Label>
              <Input
                type="number"
                value={procedure.price}
                onChange={(e) => onChange({ ...procedure, price: Number(e.target.value) })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Show in your library</p>
              </div>
              <Switch checked={procedure.is_active} onCheckedChange={(checked) => onChange({ ...procedure, is_active: checked })} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 col-span-2">
              <div>
                <Label>Bookable</Label>
                <p className="text-xs text-muted-foreground">Allow patients to book this procedure</p>
              </div>
              <Switch
                checked={procedure.is_bookable ?? true}
                onCheckedChange={(checked) => onChange({ ...procedure, is_bookable: checked })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSave}>Save Changes</Button>
          </div>

          {procedure.is_consultation ? (
            <div className="text-xs text-muted-foreground">
              Note: Editing this procedure also updates your consultation fee/settings.
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
