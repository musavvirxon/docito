import { useState, useEffect } from "react";
import { Plus, Search, Filter, Edit, Trash2, Copy, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useProcedures } from "@/hooks/useProcedures";

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

const DoctorProcedureLibrarySection = () => {
  const { user } = useAuth();
  const { createProcedure, loading: createLoading } = useProcedures();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [filteredProcedures, setFilteredProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

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
    { value: "general", label: "General" },
    { value: "other", label: "Other" }
  ];

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "single_visit", label: "Single Visit" },
    { value: "multi_visit", label: "Multi Visit" },
    { value: "emergency", label: "Emergency" }
  ];

  useEffect(() => {
    fetchProcedureLibrary();
  }, []);

  useEffect(() => {
    filterProcedures();
  }, [procedures, searchTerm, categoryFilter, typeFilter]);

  const fetchProcedureLibrary = async () => {
    try {
      setLoading(true);
      
      // Load sample procedures for demonstration
      const sampleProcedures: Procedure[] = [
        {
          id: 'lib-1',
          dentist_id: 'library',
          name: 'Routine Dental Cleaning',
          category: 'preventive',
          type: 'single_visit',
          default_cost: 120,
          duration_minutes: 30,
          notes: 'Routine dental cleaning and examination including scaling and polishing',
          tooth_range: [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'lib-2',
          dentist_id: 'library',
          name: 'Composite Filling',
          category: 'restorative',
          type: 'single_visit',
          default_cost: 180,
          duration_minutes: 45,
          notes: 'White composite resin filling for cavities',
          tooth_range: [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'lib-3',
          dentist_id: 'library',
          name: 'Root Canal Treatment',
          category: 'endodontic',
          type: 'multi_visit',
          default_cost: 800,
          duration_minutes: 90,
          notes: 'Endodontic treatment for infected or damaged tooth pulp',
          tooth_range: [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'lib-4',
          dentist_id: 'library',
          name: 'Tooth Extraction',
          category: 'oral_surgery',
          type: 'single_visit',
          default_cost: 250,
          duration_minutes: 30,
          notes: 'Simple tooth extraction procedure',
          tooth_range: [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'lib-5',
          dentist_id: 'library',
          name: 'Dental Crown',
          category: 'prosthodontic',
          type: 'multi_visit',
          default_cost: 1200,
          duration_minutes: 60,
          notes: 'Ceramic or porcelain crown for damaged teeth',
          tooth_range: [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'lib-6',
          dentist_id: 'library',
          name: 'Teeth Whitening',
          category: 'cosmetic',
          type: 'single_visit',
          default_cost: 400,
          duration_minutes: 60,
          notes: 'Professional in-office teeth whitening treatment',
          tooth_range: [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'lib-7',
          dentist_id: 'library',
          name: 'Dental Implant',
          category: 'oral_surgery',
          type: 'multi_visit',
          default_cost: 2500,
          duration_minutes: 120,
          notes: 'Surgical placement of dental implant and crown',
          tooth_range: [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'lib-8',
          dentist_id: 'library',
          name: 'Periodontal Scaling',
          category: 'periodontal',
          type: 'single_visit',
          default_cost: 300,
          duration_minutes: 60,
          notes: 'Deep cleaning for gum disease treatment',
          tooth_range: [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];
      
      setProcedures(sampleProcedures);
    } catch (error: any) {
      toast.error("Failed to load procedure library: " + error.message);
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

  const handleAddToMyProcedures = async (procedure: Procedure) => {
    if (!user) {
      toast.error("Please sign in to add procedures");
      return;
    }

    if (!createProcedure) {
      toast.error("Unable to add procedure at this time");
      return;
    }

    try {
      await createProcedure({
        name: procedure.name,
        description: procedure.notes || '',
        category: procedure.category as any,
        type: procedure.type as any,
        default_cost: procedure.default_cost,
        duration_minutes: procedure.duration_minutes || 30,
        is_active: true
      });
      
      toast.success(`${procedure.name} added to your procedures`);
    } catch (error: any) {
      toast.error("Failed to add procedure: " + error.message);
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
      general: "bg-gray-100 text-gray-800",
      other: "bg-gray-100 text-gray-800"
    };
    return colors[category] || colors.other;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-foreground">Loading procedure library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              Procedure Library
            </h2>
            <p className="text-muted-foreground">Browse and add standard procedures to your practice</p>
          </div>
        </div>
      </div>

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
          <CardTitle>Standard Procedures ({filteredProcedures.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProcedures.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No procedures found matching your criteria</p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("all");
                  setTypeFilter("all");
                }}
                className="mt-4"
              >
                Clear Filters
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
                  <TableHead>Duration</TableHead>
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
                      {procedure.duration_minutes ? `${procedure.duration_minutes} min` : "Not set"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAddToMyProcedures(procedure)}
                        disabled={createLoading}
                        className="flex items-center gap-1"
                      >
                        {createLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                        Add to My Procedures
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorProcedureLibrarySection;