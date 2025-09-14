import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Clock, DollarSign, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProcedurePrescription } from "@/hooks/useProcedurePrescription";
import { toast } from "sonner";

interface Procedure {
  id: string;
  name: string;
  category: string;
  estimated_duration_minutes: number;
  price?: number;
  description?: string;
  what_to_expect?: string;
  informed_consent_template?: string;
  default_notes_template?: string;
}

interface ProcedurePrescriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const ProcedurePrescriptionModal = ({
  open,
  onOpenChange,
  appointmentId,
  patientId,
  onSuccess,
}: ProcedurePrescriptionModalProps) => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [filteredProcedures, setFilteredProcedures] = useState<Procedure[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProcedures, setSelectedProcedures] = useState<(Procedure & { notes?: string; customCost?: number })[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const { prescribeProcedure, isLoading: prescribing } = useProcedurePrescription();

  // Fetch doctor's procedures
  useEffect(() => {
    const fetchProcedures = async () => {
      if (!user || !open) return;

      setLoading(true);
      try {
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!doctorData) return;

        const { data, error } = await supabase
          .from('procedures')
          .select('*')
          .eq('dentist_id', doctorData.id)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;

        setProcedures(data || []);
        setFilteredProcedures(data || []);
      } catch (error: any) {
        console.error('Error fetching procedures:', error);
        toast.error('Failed to load procedures');
      } finally {
        setLoading(false);
      }
    };

    fetchProcedures();
  }, [user, open]);

  // Filter procedures based on search
  useEffect(() => {
    const filtered = procedures.filter(procedure =>
      procedure.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      procedure.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      procedure.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProcedures(filtered);
  }, [searchTerm, procedures]);

  const handleSelectProcedure = (procedure: Procedure) => {
    const isSelected = selectedProcedures.some(p => p.id === procedure.id);
    
    if (isSelected) {
      setSelectedProcedures(prev => prev.filter(p => p.id !== procedure.id));
    } else {
      setSelectedProcedures(prev => [...prev, { 
        ...procedure, 
        notes: procedure.default_notes_template || '',
        customCost: procedure.price || 0
      }]);
    }
  };

  const updateSelectedProcedure = (procedureId: string, field: 'notes' | 'customCost', value: string | number) => {
    setSelectedProcedures(prev =>
      prev.map(p => 
        p.id === procedureId 
          ? { ...p, [field]: value }
          : p
      )
    );
  };

  const handlePrescribeAll = async () => {
    if (selectedProcedures.length === 0) {
      toast.error('Please select at least one procedure');
      return;
    }

    try {
      // Prescribe each selected procedure
      for (const procedure of selectedProcedures) {
        await prescribeProcedure({
          appointmentId,
          procedureId: procedure.id,
          procedureNotes: procedure.notes,
          estimatedCost: procedure.customCost,
          patientId,
          procedureName: procedure.name,
          procedureDescription: procedure.description,
          consentTemplate: procedure.informed_consent_template,
        });
      }

      // Reset and close
      setSelectedProcedures([]);
      setSearchTerm("");
      onOpenChange(false);
      onSuccess?.();
      
    } catch (error) {
      console.error('Error prescribing procedures:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Prescribe Procedures</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-6">
          {/* Procedure Library */}
          <div className="flex-1 flex flex-col">
            <div className="mb-4">
              <Label htmlFor="search">Search Procedures</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, category, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading procedures...</span>
                </div>
              ) : filteredProcedures.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No procedures match your search' : 'No procedures available'}
                </div>
              ) : (
                filteredProcedures.map((procedure) => {
                  const isSelected = selectedProcedures.some(p => p.id === procedure.id);
                  
                  return (
                    <Card 
                      key={procedure.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                      onClick={() => handleSelectProcedure(procedure)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{procedure.name}</h3>
                          <Badge variant="outline">{procedure.category}</Badge>
                        </div>
                        
                        {procedure.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {procedure.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{procedure.estimated_duration_minutes} min</span>
                          </div>
                          
                          {procedure.price && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              <span>{formatCurrency(procedure.price)}</span>
                            </div>
                          )}
                          
                          {procedure.informed_consent_template && (
                            <div className="flex items-center gap-1 text-orange-600">
                              <FileText className="h-4 w-4" />
                              <span>Consent Required</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Procedures */}
          <div className="w-96 flex flex-col">
            <h3 className="font-semibold mb-4">
              Selected Procedures ({selectedProcedures.length})
            </h3>

            <div className="flex-1 overflow-y-auto space-y-4">
              {selectedProcedures.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Select procedures from the library</p>
                </div>
              ) : (
                selectedProcedures.map((procedure) => (
                  <Card key={procedure.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{procedure.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label htmlFor={`notes-${procedure.id}`}>Procedure Notes</Label>
                        <Textarea
                          id={`notes-${procedure.id}`}
                          placeholder="Add specific notes for this procedure..."
                          value={procedure.notes || ''}
                          onChange={(e) => updateSelectedProcedure(procedure.id, 'notes', e.target.value)}
                          rows={3}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`cost-${procedure.id}`}>Estimated Cost</Label>
                        <Input
                          id={`cost-${procedure.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={procedure.customCost || 0}
                          onChange={(e) => updateSelectedProcedure(procedure.id, 'customCost', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedProcedures.length > 0 && (
              <>
                Total: {formatCurrency(selectedProcedures.reduce((sum, p) => sum + (p.customCost || 0), 0))}
              </>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePrescribeAll}
              disabled={selectedProcedures.length === 0 || prescribing}
            >
              {prescribing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Prescribing...
                </>
              ) : (
                `Prescribe ${selectedProcedures.length} Procedure${selectedProcedures.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};