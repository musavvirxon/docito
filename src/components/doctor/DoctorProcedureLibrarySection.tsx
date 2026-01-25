// File: src/components/doctor/DoctorProcedureLibrarySection.tsx
import { useState, useEffect } from "react";
import { Plus, Search, Filter, Edit, Trash2, BookOpen, Loader2, Eye, EyeOff, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import AddProcedureModal from "@/components/procedure/AddProcedureModal";
import EditProcedureModal from "@/components/procedure/EditProcedureModal";
import ManageCategoriesModal from "@/components/doctor/ManageCategoriesModal";
import ManageTypesModal from "@/components/doctor/ManageTypesModal";
import { useTranslation } from "react-i18next";
import { getProcedureCategoryLabel } from "@/lib/procedureCategories";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Procedure {
  id: string;
  dentist_id: string;
  name: string;
  category: string;
  type: string;
  default_cost: number;
  duration_minutes?: number;
  notes?: string;
  tooth_range?: number[];
  is_active: boolean;
  is_bookable?: boolean;
  price?: number | null;
  is_consultation?: boolean;
  created_at: string;
  updated_at: string;
}

const DoctorProcedureLibrarySection = () => {
  const {
    t
  } = useTranslation("dashboard");
  const {
    user
  } = useAuth();
  type DoctorProcedureSettings = {
    doctor_id: string;
    verified: boolean;
    consultation_fee: number | null;
    accepts_new_patients: boolean | null;
    consultation_procedure_id: string | null;
    consultation_procedure_cost: number | null;
    consultation_is_bookable: boolean | null;
  };

  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settings, setSettings] = useState<DoctorProcedureSettings | null>(null);
  const [consultationFeeInput, setConsultationFeeInput] = useState<string>("");
  const [acceptsNewPatientsInput, setAcceptsNewPatientsInput] = useState<boolean>(true);
  const [consultationBookableInput, setConsultationBookableInput] = useState<boolean>(true);

  const loadDoctorProcedureSettings = async () => {
    if (!user) return;
    setSettingsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("doctor-procedures-settings", {
        body: { action: "get" },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to load settings");
      const payload = data.data as DoctorProcedureSettings;
      setSettings(payload);
      setDoctorId(payload.doctor_id || null);
      setConsultationFeeInput(payload.consultation_fee != null ? String(payload.consultation_fee) : "");
      setAcceptsNewPatientsInput(payload.accepts_new_patients ?? true);
      setConsultationBookableInput(payload.consultation_is_bookable ?? true);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load doctor settings");
      setSettings(null);
      setDoctorId(null);
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveDoctorProcedureSettings = async () => {
    if (!user) return;
    setSettingsSaving(true);
    try {
      const fee = consultationFeeInput.trim() === "" ? null : Number(consultationFeeInput);
      if (fee != null && (Number.isNaN(fee) || fee < 0)) {
        throw new Error("Consultation fee must be a non-negative number");
      }
      const { data, error } = await supabase.functions.invoke("doctor-procedures-settings", {
        body: {
          action: "save",
          consultation_fee: fee,
          accepts_new_patients: acceptsNewPatientsInput,
          consultation_is_bookable: consultationBookableInput,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to save settings");
      toast.success("Settings updated");
      setSettingsOpen(false);
      await loadDoctorProcedureSettings();
      await fetchProcedures();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save settings");
    } finally {
      setSettingsSaving(false);
    }
  };
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [filteredProcedures, setFilteredProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
  const [showManageTypesModal, setShowManageTypesModal] = useState(false);

  // Default categories and types
  const defaultCategories = [{
    value: "general_consultation",
    label: "General Consultation"
  }, {
    value: "diagnostic",
    label: "Diagnostic"
  }, {
    value: "preventive_care",
    label: "Preventive Care"
  }, {
    value: "restorative",
    label: "Restorative"
  }, {
    value: "cosmetic",
    label: "Cosmetic"
  }, {
    value: "orthodontic",
    label: "Orthodontic"
  }, {
    value: "surgical",
    label: "Surgical"
  }, {
    value: "prosthodontic",
    label: "Prosthodontic"
  }, {
    value: "endodontic",
    label: "Endodontic"
  }, {
    value: "periodontal",
    label: "Periodontal"
  }, {
    value: "oral_surgery",
    label: "Oral Surgery"
  }, {
    value: "other",
    label: "Other"
  }];
  const defaultTypes = [{
    value: "single_visit",
    label: "Single Visit"
  }, {
    value: "multi_visit",
    label: "Multiple Visits"
  }, {
    value: "emergency",
    label: "Emergency"
  }, {
    value: "follow_up",
    label: "Follow-up"
  }, {
    value: "consultation",
    label: "Consultation"
  }];
  const [categories, setCategories] = useState(defaultCategories);
  const [types, setTypes] = useState(defaultTypes);

  // Options for filtering
  const [categoryOptions, setCategoryOptions] = useState([{
    value: "all",
    label: "All Categories"
  }, ...defaultCategories]);
  const [typeOptions, setTypeOptions] = useState([{
    value: "all",
    label: "All Types"
  }, ...defaultTypes]);

  // Load custom categories and types from localStorage
  useEffect(() => {
    loadCustomCategoriesAndTypes();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadDoctorProcedureSettings();
    fetchProcedures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  const loadCustomCategoriesAndTypes = () => {
    const savedCustomCategories = localStorage.getItem('customProcedureCategories');
    const savedCustomTypes = localStorage.getItem('customProcedureTypes');
    const parsedCustomCategories = savedCustomCategories ? JSON.parse(savedCustomCategories) : [];
    const parsedCustomTypes = savedCustomTypes ? JSON.parse(savedCustomTypes) : [];
    setCustomCategories(parsedCustomCategories);
    setCustomTypes(parsedCustomTypes);

    // Update categories and options
    const allCategories = [...defaultCategories, ...parsedCustomCategories];
    setCategories(allCategories);
    setCategoryOptions([{
      value: "all",
      label: "All Categories"
    }, ...allCategories]);

    // Update types and options
    const allTypes = [...defaultTypes, ...parsedCustomTypes];
    setTypes(allTypes);
    setTypeOptions([{
      value: "all",
      label: "All Types"
    }, ...allTypes]);
  };

  // Update categories and types when modals are closed
  const [customCategories, setCustomCategories] = useState<Array<{
    value: string;
    label: string;
  }>>([]);
  const [customTypes, setCustomTypes] = useState<Array<{
    value: string;
    label: string;
  }>>([]);
  const handleUpdateCategories = (newCustomCategories: Array<{
    value: string;
    label: string;
  }>) => {
    setCustomCategories(newCustomCategories);
    localStorage.setItem('customProcedureCategories', JSON.stringify(newCustomCategories));
    const allCategories = [...defaultCategories, ...newCustomCategories];
    setCategories(allCategories);
    setCategoryOptions([{
      value: "all",
      label: "All Categories"
    }, ...allCategories]);
  };
  const handleUpdateTypes = (newCustomTypes: Array<{
    value: string;
    label: string;
  }>) => {
    setCustomTypes(newCustomTypes);
    localStorage.setItem('customProcedureTypes', JSON.stringify(newCustomTypes));
    const allTypes = [...defaultTypes, ...newCustomTypes];
    setTypes(allTypes);
    setTypeOptions([{
      value: "all",
      label: "All Types"
    }, ...allTypes]);
  };
  useEffect(() => {
    filterProcedures();
  }, [procedures, searchTerm, categoryFilter, typeFilter]);
  const fetchProcedures = async () => {
    try {
      setLoading(true);
      if (!user) {
        toast.error("Please sign in to view procedures");
        return;
      }

      // Get doctor ID from user (cached)
      let resolvedDoctorId = doctorId;
      if (!resolvedDoctorId) {
        const { data: doctorData, error: doctorError } = await supabase
          .from("doctors")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (doctorError || !doctorData) {
          toast.error("Doctor profile not found");
          return;
        }

        resolvedDoctorId = doctorData.id as string;
        setDoctorId(resolvedDoctorId);
      }

      // Fetch doctor's procedures
      const {
        data,
        error
      } = await supabase.from("procedures").select("*").eq("dentist_id", resolvedDoctorId).eq("is_active", true).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setProcedures(data || []);
    } catch (error: any) {
      toast.error("Failed to load procedures: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  const filterProcedures = () => {
    let filtered = procedures;
    if (searchTerm) {
      filtered = filtered.filter(proc => proc.name.toLowerCase().includes(searchTerm.toLowerCase()) || proc.notes && proc.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter(proc => proc.category === categoryFilter);
    }
    if (typeFilter !== "all") {
      filtered = filtered.filter(proc => proc.type === typeFilter);
    }
    setFilteredProcedures(filtered);
  };
  const handleDeleteProcedure = async (id: string) => {
    if (!confirm("Are you sure you want to delete this procedure?")) return;
    try {
      const {
        error
      } = await supabase.from("procedures").update({
        is_active: false
      }).eq("id", id);
      if (error) throw error;
      toast.success("Procedure deleted successfully");
      fetchProcedures();
    } catch (error: any) {
      toast.error("Failed to delete procedure: " + error.message);
    }
  };
  const handleToggleBookable = async (id: string, currentStatus: boolean) => {
    try {
      const {
        error
      } = await supabase.from("procedures").update({
        is_bookable: !currentStatus
      }).eq("id", id);
      if (error) throw error;
      toast.success(`Procedure ${!currentStatus ? 'enabled' : 'disabled'} for booking`);
      fetchProcedures();
    } catch (error: any) {
      toast.error("Failed to update procedure: " + error.message);
    }
  };
  const handleEnableAllBooking = async () => {
    try {
      if (!user) return;
      const {
        data: doctorData,
        error: doctorError
      } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
      if (doctorError || !doctorData) {
        toast.error("Doctor profile not found");
        return;
      }
      const {
        error
      } = await supabase.from("procedures").update({
        is_bookable: true
      }).eq("dentist_id", doctorData.id).eq("is_active", true);
      if (error) throw error;
      toast.success("All procedures enabled for booking");
      fetchProcedures();
    } catch (error: any) {
      toast.error("Failed to update procedures: " + error.message);
    }
  };
  const handleDisableAllBooking = async () => {
    try {
      if (!user) return;
      const {
        data: doctorData,
        error: doctorError
      } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
      if (doctorError || !doctorData) {
        toast.error("Doctor profile not found");
        return;
      }
      const {
        error
      } = await supabase.from("procedures").update({
        is_bookable: false
      }).eq("dentist_id", doctorData.id).eq("is_active", true);
      if (error) throw error;
      toast.success("All procedures disabled for booking");
      fetchProcedures();
    } catch (error: any) {
      toast.error("Failed to update procedures: " + error.message);
    }
  };

  // Calculate statistics
  const totalProcedures = procedures.length;
  const bookableProcedures = procedures.filter(p => p.is_bookable);
  const averageFee = procedures.length > 0 ? procedures.reduce((sum, proc) => sum + (proc.default_cost || 0), 0) / procedures.length : 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            {t("doctor.procedures.title")}
          </h2>
          <p className="text-muted-foreground">
            Manage your procedure library and booking availability
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add New Procedure
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Procedures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProcedures}</div>
            <p className="text-xs text-muted-foreground">In your library</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bookable Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookableProcedures.length}</div>
            <p className="text-xs text-muted-foreground">Available for online booking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Fee</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageFee.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Per procedure</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Button onClick={handleEnableAllBooking} variant="outline">
              Enable All for Booking
            </Button>
            <Button onClick={handleDisableAllBooking} variant="outline">
              Disable All Booking
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowManageCategoriesModal(true)}>
              <Settings className="w-4 h-4" />
              Manage Categories
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowManageTypesModal(true)}>
              <Settings className="w-4 h-4" />
              Manage Types
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => setSettingsOpen(true)}>
              <Settings className="w-4 h-4" />
              Consultation Settings
            </Button>

          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input placeholder="Search procedures..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map(option => <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map(option => <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => {
            setSearchTerm("");
            setCategoryFilter("all");
            setTypeFilter("all");
          }} variant="outline">
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Procedures Table */}
      <Card>
        <CardHeader>
          <CardTitle>Procedure List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div> : filteredProcedures.length === 0 ? <div className="text-center py-8">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No procedures found</h3>
              <p className="text-muted-foreground mb-4">
                {procedures.length === 0 ? "Add your first procedure to get started" : "Try adjusting your search filters"}
              </p>
              {procedures.length === 0 && <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Procedure
                </Button>}
            </div> : <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Procedure</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcedures.map(procedure => <TableRow key={procedure.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{procedure.name}</p>
                        {procedure.notes && <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {procedure.notes}
                          </p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {categoryOptions.find(c => c.value === procedure.category)?.label || getProcedureCategoryLabel(procedure.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {typeOptions.find(t => t.value === procedure.type)?.label || procedure.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {procedure.default_cost ? formatCurrency(procedure.default_cost) : "Not set"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={procedure.is_bookable ? "default" : "secondary"}>
                        {procedure.is_bookable ? "Bookable" : "Private"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {procedure.is_consultation ? <>
                            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="hover:bg-primary/10">
                              <Settings className="w-4 h-4 mr-1" />
                              Settings
                            </Button>
                            <Badge variant="secondary">Consultation</Badge>
                          </> : <>
                            <Button variant="outline" size="sm" onClick={() => setEditingProcedure(procedure)} className="hover:bg-primary/10">
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            {procedure.is_bookable ? <Button variant="outline" size="sm" onClick={() => handleToggleBookable(procedure.id, true)} className="hover:bg-orange-100 flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                Make Private
                              </Button> : <Button variant="outline" size="sm" onClick={() => handleToggleBookable(procedure.id, false)} className="hover:bg-green-100 flex items-center gap-1">
                                <EyeOff className="w-4 h-4" />
                                Make Public
                              </Button>}
                            <Button variant="outline" size="sm" onClick={() => handleDeleteProcedure(procedure.id)} className="hover:bg-destructive/10 text-destructive">
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </>}
                      </div>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>}
        </CardContent>
      </Card>

      {/* Consultation & Booking Settings */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Consultation & Booking Settings</DialogTitle>
          </DialogHeader>

          {settingsLoading ? (
            <div className="flex items-center gap-3 py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div className="text-sm text-muted-foreground">Loading settings…</div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">Profile verification</div>
                    <div className="text-xs text-muted-foreground">
                      Consultation procedure is auto-created when your profile is verified and you set a consultation fee.
                    </div>
                  </div>
                  <Badge variant={settings?.verified ? "default" : "secondary"}>{settings?.verified ? "Verified" : "Not verified"}</Badge>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="consultation_fee">Consultation fee</Label>
                  <Input
                    id="consultation_fee"
                    inputMode="decimal"
                    placeholder="e.g., 50"
                    value={consultationFeeInput}
                    onChange={(e) => setConsultationFeeInput(e.target.value)}
                  />
                  <div className="text-xs text-muted-foreground">
                    This amount will sync to your consultation procedure’s default cost.
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="font-medium">Accept new patients</div>
                    <div className="text-xs text-muted-foreground">Show availability for new patients on your profile.</div>
                  </div>
                  <Switch checked={acceptsNewPatientsInput} onCheckedChange={setAcceptsNewPatientsInput} />
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="font-medium">Consultation is bookable</div>
                    <div className="text-xs text-muted-foreground">Allow patients to book consultation online.</div>
                  </div>
                  <Switch checked={consultationBookableInput} onCheckedChange={setConsultationBookableInput} />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSettingsOpen(false)} disabled={settingsSaving}>
                  Cancel
                </Button>
                <Button onClick={saveDoctorProcedureSettings} disabled={settingsSaving}>
                  {settingsSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <AddProcedureModal open={showAddModal} onOpenChange={setShowAddModal} onSuccess={() => {
      setShowAddModal(false);
      fetchProcedures();
    }} categories={categories} types={types} onOpenCategoryModal={() => {
      setShowAddModal(false);
      setShowManageCategoriesModal(true);
    }} onOpenTypeModal={() => {
      setShowAddModal(false);
      setShowManageTypesModal(true);
    }} />

      {editingProcedure && <EditProcedureModal open={!!editingProcedure} onOpenChange={open => !open && setEditingProcedure(null)} procedure={editingProcedure} onSuccess={() => {
      setEditingProcedure(null);
      fetchProcedures();
    }} categories={categories} types={types} />}

      <ManageCategoriesModal 
        open={showManageCategoriesModal} 
        onOpenChange={open => {
          setShowManageCategoriesModal(open);
          if (!open) {
            loadCustomCategoriesAndTypes();
          }
        }} 
        categories={customCategories} 
        onCategoriesChange={handleUpdateCategories}
        defaultCategories={defaultCategories}
      />

      <ManageTypesModal 
        open={showManageTypesModal} 
        onOpenChange={open => {
          setShowManageTypesModal(open);
          if (!open) {
            loadCustomCategoriesAndTypes();
          }
        }} 
        types={customTypes} 
        onTypesChange={handleUpdateTypes}
        defaultTypes={defaultTypes}
      />
    </div>;
};
export default DoctorProcedureLibrarySection;
