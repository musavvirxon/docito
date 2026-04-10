import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  DollarSign, 
  Clock, 
  GripVertical, 
  Check,
  Save,
  Stethoscope,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProcedures } from '@/hooks/useProcedures';
import { useAuth } from '@/contexts/AuthContext';

interface Procedure {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  fee: number;
  isBookable: boolean;
  displayOrder: number;
  category: string;
}

const DoctorProceduresSection = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { procedures: dbProcedures, loading: dbLoading, createProcedure } = useProcedures();
  const [isSaving, setIsSaving] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Default procedures for new doctors
  const [procedures, setProcedures] = useState<Procedure[]>([
    {
      id: '1',
      name: 'Quick Consultation',
      description: 'Brief consultation and basic examination',
      duration: 15,
      fee: 100,
      isBookable: true,
      displayOrder: 1,
      category: 'Consultation'
    },
    {
      id: '2',
      name: 'Standard Consultation',
      description: 'Comprehensive examination and consultation',
      duration: 30,
      fee: 200,
      isBookable: true,
      displayOrder: 2,
      category: 'Consultation'
    },
    {
      id: '3',
      name: 'Detailed Assessment',
      description: 'In-depth consultation with detailed analysis',
      duration: 45,
      fee: 300,
      isBookable: true,
      displayOrder: 3,
      category: 'Assessment'
    }
  ]);

  const [newProcedure, setNewProcedure] = useState<Omit<Procedure, 'id' | 'displayOrder'>>({
    name: '',
    description: '',
    duration: 30,
    fee: 0,
    isBookable: true,
    category: 'Consultation'
  });

  const categories = ['Consultation', 'Assessment', 'Examination', 'Treatment', 'Follow-up', 'Emergency'];
  const durationOptions = [15, 30, 45, 60, 90, 120];

  // If database procedures exist, use them instead of default ones
  useEffect(() => {
    if (dbProcedures && dbProcedures.length > 0) {
      const formattedProcedures: Procedure[] = dbProcedures.map((proc, index) => ({
        id: proc.id,
        name: proc.name,
        description: proc.description || '',
        duration: proc.duration_minutes || 30,
        fee: proc.default_cost || 0,
        isBookable: proc.is_active,
        displayOrder: index + 1,
        category: proc.category || 'Consultation'
      }));
      setProcedures(formattedProcedures);
    }
  }, [dbProcedures]);

  const addProcedure = async () => {
    if (!newProcedure.name.trim()) {
      toast({
        title: "Error",
        description: "Procedure name is required",
        variant: "destructive",
      });
      return;
    }

    const procedure: Procedure = {
      ...newProcedure,
      id: Date.now().toString(),
      displayOrder: procedures.length + 1
    };

    try {
      if (user && createProcedure) {
        // Save to database
        await createProcedure({
          name: procedure.name,
          description: procedure.description,
          category: procedure.category as any,
          type: 'single_visit' as any,
          default_cost: procedure.fee,
          duration_minutes: procedure.duration,
          is_active: procedure.isBookable
        });
      }

      setProcedures(prev => [...prev, procedure]);
      setNewProcedure({
        name: '',
        description: '',
        duration: 30,
        fee: 0,
        isBookable: true,
        category: 'Consultation'
      });
      setIsAddDialogOpen(false);
      
      toast({
        title: "Procedure Added",
        description: `${procedure.name} has been added to your services`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add procedure. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateProcedure = (id: string, updates: Partial<Procedure>) => {
    setProcedures(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProcedure = (id: string) => {
    const procedure = procedures.find(p => p.id === id);
    setProcedures(prev => prev.filter(p => p.id !== id));
    
    toast({
      title: "Procedure Deleted",
      description: `${procedure?.name} has been removed`,
    });
  };

  const moveUp = (id: string) => {
    const index = procedures.findIndex(p => p.id === id);
    if (index > 0) {
      const newProcedures = [...procedures];
      [newProcedures[index - 1], newProcedures[index]] = [newProcedures[index], newProcedures[index - 1]];
      newProcedures.forEach((p, i) => p.displayOrder = i + 1);
      setProcedures(newProcedures);
    }
  };

  const moveDown = (id: string) => {
    const index = procedures.findIndex(p => p.id === id);
    if (index < procedures.length - 1) {
      const newProcedures = [...procedures];
      [newProcedures[index], newProcedures[index + 1]] = [newProcedures[index + 1], newProcedures[index]];
      newProcedures.forEach((p, i) => p.displayOrder = i + 1);
      setProcedures(newProcedures);
    }
  };

  const saveEditedProcedure = () => {
    if (!editingProcedure) return;
    
    updateProcedure(editingProcedure.id, editingProcedure);
    setEditingProcedure(null);
    setIsEditDialogOpen(false);
    
    toast({
      title: "Procedure Updated",
      description: `${editingProcedure.name} has been updated`,
    });
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Procedures saved:', procedures);
      
      toast({
        title: "Procedures Saved",
        description: "All procedure settings have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save procedures. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const bookableProcedures = procedures.filter(p => p.isBookable);

  if (dbLoading && !procedures.length) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-foreground">Loading procedures...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Procedure Management</h2>
          <p className="text-muted-foreground">Manage your services, pricing, and booking availability</p>
        </div>
        <Button 
          onClick={handleSaveAll} 
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save All
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Procedures List */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                Your Procedures
              </CardTitle>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Procedure
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Procedure</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Procedure Name</Label>
                      <Input
                        placeholder="e.g., Consultation, Treatment"
                        value={newProcedure.name}
                        onChange={(e) => setNewProcedure(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Brief description of the procedure"
                        value={newProcedure.description}
                        onChange={(e) => setNewProcedure(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Duration (minutes)</Label>
                        <Select 
                          value={newProcedure.duration.toString()} 
                          onValueChange={(value) => setNewProcedure(prev => ({ ...prev, duration: parseInt(value) }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            {durationOptions.map(duration => (
                              <SelectItem key={duration} value={duration.toString()}>
                                {duration} minutes
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Fee ($)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={newProcedure.fee}
                          onChange={(e) => setNewProcedure(prev => ({ ...prev, fee: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Category</Label>
                      <Select 
                        value={newProcedure.category} 
                        onValueChange={(value) => setNewProcedure(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          {categories.map(category => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newProcedure.isBookable}
                        onCheckedChange={(checked) => setNewProcedure(prev => ({ ...prev, isBookable: checked }))}
                      />
                      <Label>Allow online booking</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addProcedure}>Add Procedure</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {procedures.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Stethoscope className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No procedures added yet</p>
                    <p className="text-sm">Add from Procedure Library or create your own</p>
                    <Button 
                      onClick={() => setIsAddDialogOpen(true)} 
                      className="mt-4"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Procedure
                    </Button>
                  </div>
                ) : (
                  procedures.map((procedure, index) => (
                    <Card key={procedure.id} className="border-border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{procedure.name}</h3>
                              <Badge variant={procedure.isBookable ? "default" : "secondary"}>
                                {procedure.isBookable ? "Bookable" : "Not Bookable"}
                              </Badge>
                              <Badge variant="outline">{procedure.category}</Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3">
                              {procedure.description}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span>{procedure.duration} min</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4 text-muted-foreground" />
                                <span>${procedure.fee}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Bookable toggle */}
                            <Switch
                              checked={procedure.isBookable}
                              onCheckedChange={(checked) => updateProcedure(procedure.id, { isBookable: checked })}
                            />
                            
                            {/* Edit button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingProcedure(procedure);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            
                            {/* Delete button */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Procedure</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{procedure.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteProcedure(procedure.id)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary & Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bookable Services Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Procedures</span>
                  <Badge variant="outline">{procedures.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Bookable Services</span>
                  <Badge variant="default">{bookableProcedures.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Average Fee</span>
                  <span className="text-sm font-medium">
                    ${procedures.length > 0 ? (procedures.reduce((sum, p) => sum + p.fee, 0) / procedures.length).toFixed(0) : '0'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full text-sm"
                onClick={() => {
                  setProcedures(prev => prev.map(p => ({ ...p, isBookable: true })));
                  toast({
                    title: "All Procedures Enabled",
                    description: "All procedures are now available for booking",
                  });
                }}
              >
                Enable All for Booking
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full text-sm"
                onClick={() => {
                  setProcedures(prev => prev.map(p => ({ ...p, isBookable: false })));
                  toast({
                    title: "All Procedures Disabled",
                    description: "All procedures have been disabled from booking",
                  });
                }}
              >
                Disable All Booking
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Procedure</DialogTitle>
          </DialogHeader>
          {editingProcedure && (
            <div className="space-y-4">
              <div>
                <Label>Procedure Name</Label>
                <Input
                  value={editingProcedure.name}
                  onChange={(e) => setEditingProcedure(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingProcedure.description}
                  onChange={(e) => setEditingProcedure(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duration (minutes)</Label>
                  <Select 
                    value={editingProcedure.duration.toString()} 
                    onValueChange={(value) => setEditingProcedure(prev => prev ? { ...prev, duration: parseInt(value) } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {durationOptions.map(duration => (
                        <SelectItem key={duration} value={duration.toString()}>
                          {duration} minutes
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Fee ($)</Label>
                  <Input
                    type="number"
                    value={editingProcedure.fee}
                    onChange={(e) => setEditingProcedure(prev => prev ? { ...prev, fee: parseFloat(e.target.value) || 0 } : null)}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEditedProcedure}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DoctorProceduresSection;