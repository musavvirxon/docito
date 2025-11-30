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

  // Comprehensive treatment categories for medicine and dentistry
  const defaultCategories = [
    // General Medicine
    { value: "general_consultation", label: "General Consultation" },
    { value: "preventive_care", label: "Preventive Care" },
    { value: "diagnostic_testing", label: "Diagnostic Testing" },
    { value: "vaccination", label: "Vaccination & Immunization" },
    { value: "chronic_disease", label: "Chronic Disease Management" },
    { value: "acute_care", label: "Acute Care" },
    { value: "minor_surgery", label: "Minor Surgery" },
    { value: "physical_therapy", label: "Physical Therapy" },
    { value: "mental_health", label: "Mental Health" },
    { value: "womens_health", label: "Women's Health" },
    { value: "pediatric_care", label: "Pediatric Care" },
    { value: "geriatric_care", label: "Geriatric Care" },
    { value: "cardiology", label: "Cardiology" },
    { value: "dermatology", label: "Dermatology" },
    { value: "orthopedics", label: "Orthopedics" },
    { value: "neurology", label: "Neurology" },
    { value: "gastroenterology", label: "Gastroenterology" },
    { value: "pulmonology", label: "Pulmonology" },
    { value: "endocrinology", label: "Endocrinology" },
    { value: "nephrology", label: "Nephrology" },
    { value: "urology", label: "Urology" },
    { value: "ophthalmology", label: "Ophthalmology" },
    { value: "ent", label: "ENT (Ear, Nose, Throat)" },
    { value: "allergy_immunology", label: "Allergy & Immunology" },
    // Dentistry
    { value: "dental_examination", label: "Dental Examination" },
    { value: "dental_cleaning", label: "Dental Cleaning & Prophylaxis" },
    { value: "restorative", label: "Restorative (Fillings)" },
    { value: "crowns_bridges", label: "Crowns & Bridges" },
    { value: "root_canal", label: "Root Canal (Endodontics)" },
    { value: "extractions", label: "Extractions" },
    { value: "dental_implants", label: "Dental Implants" },
    { value: "dentures", label: "Dentures & Partials" },
    { value: "orthodontics", label: "Orthodontics" },
    { value: "periodontics", label: "Periodontics (Gum Treatment)" },
    { value: "cosmetic_dentistry", label: "Cosmetic Dentistry" },
    { value: "teeth_whitening", label: "Teeth Whitening" },
    { value: "veneers", label: "Veneers" },
    { value: "pediatric_dentistry", label: "Pediatric Dentistry" },
    { value: "oral_surgery", label: "Oral Surgery" },
    { value: "tmj_treatment", label: "TMJ Treatment" },
    { value: "emergency_dental", label: "Emergency Dental Care" },
  ];
  const defaultTypes = [
    { value: "single_visit", label: "Single Visit" },
    { value: "multi_visit", label: "Multi Visit" },
    { value: "tooth_based", label: "Tooth Based" },
    { value: "full_mouth", label: "Full Mouth" },
  ];
  const [customCategories, setCustomCategories] = useState<{
    value: string;
    label: string;
  }[]>([]);
  const [customTypes, setCustomTypes] = useState<{
    value: string;
    label: string;
  }[]>([]);
  const [categories, setCategories] = useState<{
    value: string;
    label: string;
  }[]>([]);
  const [types, setTypes] = useState<{
    value: string;
    label: string;
  }[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{
    value: string;
    label: string;
  }[]>([]);
  const [typeOptions, setTypeOptions] = useState<{
    value: string;
    label: string;
  }[]>([]);
  useEffect(() => {
    fetchProcedures();
    loadCustomCategoriesAndTypes();
  }, []);
  const loadCustomCategoriesAndTypes = () => {
    const savedCustomCategories = localStorage.getItem('customProcedureCategories');
    const savedCustomTypes = localStorage.getItem('customProcedureTypes');
    const parsedCustomCategories = savedCustomCategories ? JSON.parse(savedCustomCategories) : [];
    const parsedCustomTypes = savedCustomTypes ? JSON.parse(savedCustomTypes) : [];
    setCustomCategories(parsedCustomCategories);
    setCustomTypes(parsedCustomTypes);

    // Combine default and custom
    const allCategories = [...defaultCategories, ...parsedCustomCategories];
    const allTypes = [...defaultTypes, ...parsedCustomTypes];
    setCategories(allCategories);
    setTypes(allTypes);
    setCategoryOptions([{
      value: "all",
      label: "All Categories"
    }, ...allCategories]);
    setTypeOptions([{
      value: "all",
      label: "All Types"
    }, ...allTypes]);
  };
  const handleCustomCategoriesChange = (newCustomCategories: {
    value: string;
    label: string;
  }[]) => {
    setCustomCategories(newCustomCategories);
    localStorage.setItem('customProcedureCategories', JSON.stringify(newCustomCategories));
    const allCategories = [...defaultCategories, ...newCustomCategories];
    setCategories(allCategories);
    setCategoryOptions([{
      value: "all",
      label: "All Categories"
    }, ...allCategories]);
  };
  const handleCustomTypesChange = (newCustomTypes: {
    value: string;
    label: string;
  }[]) => {
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

      // Get doctor ID from user
      const {
        data: doctorData,
        error: doctorError
      } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
      if (doctorError || !doctorData) {
        toast.error("Doctor profile not found");
        return;
      }

      // Fetch doctor's procedures
      const {
        data,
        error
      } = await supabase.from("procedures").select("*").eq("dentist_id", doctorData.id).eq("is_active", true).order("created_at", {
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
        data: doctorData
      } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
      if (!doctorData) return;
      const {
        error
      } = await supabase.from("procedures").update({
        is_bookable: true
      }).eq("dentist_id", doctorData.id).eq("is_active", true);
      if (error) throw error;
      toast.success("All procedures enabled for booking");
      fetchProcedures();
    } catch (error: any) {
      toast.error("Failed to enable all procedures: " + error.message);
    }
  };
  const handleDisableAllBooking = async () => {
    try {
      if (!user) return;
      const {
        data: doctorData
      } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
      if (!doctorData) return;
      const {
        error
      } = await supabase.from("procedures").update({
        is_bookable: false
      }).eq("dentist_id", doctorData.id).eq("is_active", true);
      if (error) throw error;
      toast.success("All procedures disabled for booking");
      fetchProcedures();
    } catch (error: any) {
      toast.error("Failed to disable all procedures: " + error.message);
    }
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  if (loading) {
    return <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-foreground">{t("doctor.procedureLibrary.loading")}</p>
        </div>
      </div>;
  }
  const bookableProcedures = procedures.filter(p => p.is_bookable);
  const averageFee = procedures.length > 0 ? procedures.reduce((sum, p) => sum + (p.default_cost || 0), 0) / procedures.length : 0;
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              {t("doctor.procedureLibrary.title")}
            </h2>
            <p className="text-muted-foreground">{t("doctor.procedureLibrary.description")}</p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t("doctor.procedureLibrary.addProcedure")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Procedures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{procedures.length}</div>
            <p className="text-xs text-muted-foreground">Active procedures</p>
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
            <Button variant="outline" onClick={() => {
            setSearchTerm("");
            setCategoryFilter("all");
            setTypeFilter("all");
          }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Procedures Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Procedures ({filteredProcedures.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProcedures.length === 0 ? <div className="text-center py-8">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No procedures found. Create your first procedure to get started.</p>
              <Button onClick={() => setShowAddModal(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add First Procedure
              </Button>
            </div> : <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Procedure Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Default Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
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
                        {categoryOptions.find(c => c.value === procedure.category)?.label || procedure.category}
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
                      </div>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>}
        </CardContent>
      </Card>

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

      <ManageCategoriesModal open={showManageCategoriesModal} onOpenChange={open => {
      setShowManageCategoriesModal(open);
      if (!open) {
        loadCustomCategoriesAndTypes();
        if (showAddModal) {
          setShowAddModal(true);
        }
      }
    }} categories={customCategories} onCategoriesChange={handleCustomCategoriesChange} defaultCategories={defaultCategories} />

      <ManageTypesModal open={showManageTypesModal} onOpenChange={open => {
      setShowManageTypesModal(open);
      if (!open) {
        loadCustomCategoriesAndTypes();
        if (showAddModal) {
          setShowAddModal(true);
        }
      }
    }} types={customTypes} onTypesChange={handleCustomTypesChange} defaultTypes={defaultTypes} />
    </div>;
};
export default DoctorProcedureLibrarySection;