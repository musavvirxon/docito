import { useState, useEffect } from "react";
import { Plus, Search, Filter, Edit, Trash2, Copy, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import AddProcedureModal from "@/components/procedure/AddProcedureModal";
import EditProcedureModal from "@/components/procedure/EditProcedureModal";
import ToothSelector from "@/components/procedure/ToothSelector";

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
  created_at: string;
  updated_at: string;
}

const ProcedureLibrary = () => {
  const navigate = useNavigate();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [filteredProcedures, setFilteredProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    { value: "restorative", label: "Restorative" },
    { value: "surgical", label: "Surgical" },
    { value: "orthodontic", label: "Orthodontic" },
    { value: "periodontal", label: "Periodontal" },
    { value: "endodontic", label: "Endodontic" },
    { value: "prosthodontic", label: "Prosthodontic" },
    { value: "oral_surgery", label: "Oral Surgery" },
    { value: "preventive", label: "Preventive" },
    { value: "cosmetic", label: "Cosmetic" },
    { value: "other", label: "Other" }
  ];

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "tooth_based", label: "Tooth-based" },
    { value: "oral_cavity_region", label: "Oral Cavity Region" }
  ];

  useEffect(() => {
    fetchProcedures();
  }, []);

  useEffect(() => {
    filterProcedures();
  }, [procedures, searchTerm, categoryFilter, typeFilter]);

  const fetchProcedures = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Allow anonymous access - load sample data if not authenticated
      if (!user) {
        // Load sample procedures for demonstration
        const sampleProcedures: Procedure[] = [
          {
            id: 'sample-1',
            dentist_id: 'demo-dentist',
            name: 'General Cleaning',
            category: 'preventive',
            type: 'tooth_based',
            default_cost: 120,
            duration_minutes: 30,
            notes: 'Routine dental cleaning and examination',
            tooth_range: [],
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'sample-2',
            dentist_id: 'demo-dentist',
            name: 'Dental Filling',
            category: 'restorative',
            type: 'tooth_based',
            default_cost: 180,
            duration_minutes: 45,
            notes: 'Composite or amalgam filling',
            tooth_range: [],
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'sample-3',
            dentist_id: 'demo-dentist',
            name: 'Root Canal',
            category: 'endodontic',
            type: 'tooth_based',
            default_cost: 800,
            duration_minutes: 90,
            notes: 'Endodontic treatment for infected tooth',
            tooth_range: [],
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ];
        setProcedures(sampleProcedures);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("procedures")
        .select("*")
        .eq("dentist_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

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
      filtered = filtered.filter(proc => 
        proc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (proc.notes && proc.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      );
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
      const { error } = await supabase
        .from("procedures")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Procedure deleted successfully");
      fetchProcedures();
    } catch (error: any) {
      toast.error("Failed to delete procedure: " + error.message);
    }
  };

  const handleDuplicateProcedure = async (procedure: Procedure) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to duplicate procedures");
        return;
      }

      const duplicatedProcedure = {
        dentist_id: user.id,
        name: `${procedure.name} (Copy)`,
        category: procedure.category as any,
        type: procedure.type as any,
        default_cost: procedure.default_cost,
        notes: procedure.notes,
        tooth_range: procedure.tooth_range
      };

      const { error } = await supabase
        .from("procedures")
        .insert([duplicatedProcedure]);

      if (error) throw error;
      
      toast.success("Procedure duplicated successfully");
      fetchProcedures();
    } catch (error: any) {
      toast.error("Failed to duplicate procedure: " + error.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      restorative: "bg-blue-100 text-blue-800",
      surgical: "bg-red-100 text-red-800",
      orthodontic: "bg-green-100 text-green-800",
      periodontal: "bg-purple-100 text-purple-800",
      endodontic: "bg-orange-100 text-orange-800",
      prosthodontic: "bg-cyan-100 text-cyan-800",
      oral_surgery: "bg-red-100 text-red-800",
      preventive: "bg-emerald-100 text-emerald-800",
      cosmetic: "bg-pink-100 text-pink-800",
      other: "bg-gray-100 text-gray-800"
    };
    return colors[category] || colors.other;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading procedures...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/doctor-dashboard")}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Procedure Library</h1>
            <p className="text-muted-foreground">Manage your dental procedures and treatments</p>
          </div>
        </div>
        <Button 
          onClick={async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              toast.error("Please sign in to add procedures");
              navigate("/signup");
              return;
            }
            setShowAddModal(true);
          }} 
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Procedure
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
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
              <Input
                placeholder="Search procedures..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setCategoryFilter("all");
                setTypeFilter("all");
              }}
            >
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
          {filteredProcedures.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No procedures found. Create your first procedure to get started.</p>
              <Button onClick={() => setShowAddModal(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add First Procedure
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Procedure Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Default Cost</TableHead>
                  <TableHead>Teeth</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcedures.map((procedure) => (
                  <TableRow key={procedure.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{procedure.name}</p>
                        {procedure.notes && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {procedure.notes}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryBadgeColor(procedure.category)}>
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
                      {procedure.tooth_range && procedure.tooth_range.length > 0 ? (
                        <div className="text-sm">
                          {procedure.tooth_range.join(", ")}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">All teeth</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingProcedure(procedure)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicateProcedure(procedure)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProcedure(procedure.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddProcedureModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={() => {
          setShowAddModal(false);
          fetchProcedures();
        }}
      />

      {editingProcedure && (
        <EditProcedureModal
          open={!!editingProcedure}
          onOpenChange={(open) => !open && setEditingProcedure(null)}
          procedure={editingProcedure}
          onSuccess={() => {
            setEditingProcedure(null);
            fetchProcedures();
          }}
        />
      )}
    </div>
  );
};

export default ProcedureLibrary;