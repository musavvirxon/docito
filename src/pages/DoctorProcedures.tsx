import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Stethoscope
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import BackButton from '@/components/BackButton';

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

const DoctorProcedures = () => {
  const { toast } = useToast();
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
    },
    {
      id: '4',
      name: 'Comprehensive Exam',
      description: 'Complete examination with diagnostic testing',
      duration: 60,
      fee: 400,
      isBookable: false,
      displayOrder: 4,
      category: 'Examination'
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

  const addProcedure = () => {
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
      // Update display orders
      newProcedures.forEach((p, i) => p.displayOrder = i + 1);
      setProcedures(newProcedures);
    }
  };

  const moveDown = (id: string) => {
    const index = procedures.findIndex(p => p.id === id);
    if (index < procedures.length - 1) {
      const newProcedures = [...procedures];
      [newProcedures[index], newProcedures[index + 1]] = [newProcedures[index + 1], newProcedures[index]];
      // Update display orders
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
      // Simulate API call to save all procedures
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <BackButton />
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Procedure Management</h1>
            <p className="text-muted-foreground">Manage your services, pricing, and booking availability</p>
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
                        <p className="text-sm">Add your first procedure to get started</p>
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
                                {/* Reorder buttons */}
                                <div className="flex flex-col gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => moveUp(procedure.id)}
                                    disabled={index === 0}
                                    className="h-6 w-6 p-0"
                                  >
                                    <GripVertical className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => moveDown(procedure.id)}
                                    disabled={index === procedures.length - 1}
                                    className="h-6 w-6 p-0"
                                  >
                                    <GripVertical className="w-3 h-3" />
                                  </Button>
                                </div>
                                
                                {/* Bookable toggle */}
                                <Switch
                                  checked={procedure.isBookable}
                                  onCheckedChange={(checked) => updateProcedure(procedure.id, { isBookable: checked })}
                                />
                                
                                {/* Edit button */}
                                <Dialog open={isEditDialogOpen && editingProcedure?.id === procedure.id} onOpenChange={setIsEditDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingProcedure(procedure)}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
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
                                        
                                        <div>
                                          <Label>Category</Label>
                                          <Select 
                                            value={editingProcedure.category} 
                                            onValueChange={(value) => setEditingProcedure(prev => prev ? { ...prev, category: value } : null)}
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
                                            checked={editingProcedure.isBookable}
                                            onCheckedChange={(checked) => setEditingProcedure(prev => prev ? { ...prev, isBookable: checked } : null)}
                                          />
                                          <Label>Allow online booking</Label>
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
                                
                                {/* Delete button */}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost">
                                      <Trash2 className="w-4 h-4 text-destructive" />
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
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

            {/* Summary & Settings */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Booking Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{bookableProcedures.length}</div>
                      <div className="text-sm text-muted-foreground">Procedures available for online booking</div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-medium mb-2">Bookable Procedures:</h4>
                      <div className="space-y-1">
                        {bookableProcedures.map(procedure => (
                          <div key={procedure.id} className="flex items-center justify-between text-sm">
                            <span>{procedure.name}</span>
                            <Badge variant="outline">${procedure.fee}</Badge>
                          </div>
                        ))}
                      </div>
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
                      procedures.forEach(p => updateProcedure(p.id, { isBookable: true }));
                      toast({
                        title: "All Procedures Enabled",
                        description: "All procedures are now available for online booking",
                      });
                    }}
                  >
                    Enable All for Booking
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full text-sm"
                    onClick={() => {
                      procedures.forEach(p => updateProcedure(p.id, { isBookable: false }));
                      toast({
                        title: "All Procedures Disabled",
                        description: "No procedures are available for online booking",
                      });
                    }}
                  >
                    Disable All Booking
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 flex justify-end">
            <Button 
              onClick={handleSaveAll}
              disabled={isSaving}
              size="lg"
              className="px-8"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save All Procedures
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorProcedures;