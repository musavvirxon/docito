import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Type {
  value: string;
  label: string;
}

interface ManageTypesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  types: Type[];
  onTypesChange: (types: Type[]) => void;
}

const ManageTypesModal = ({ open, onOpenChange, types, onTypesChange }: ManageTypesModalProps) => {
  const [localTypes, setLocalTypes] = useState<Type[]>(types);
  const [newType, setNewType] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  useEffect(() => {
    setLocalTypes(types);
  }, [types]);

  const handleAddType = () => {
    if (!newType.trim()) {
      toast.error("Type name cannot be empty");
      return;
    }

    const typeValue = newType.toLowerCase().replace(/\s+/g, '_');
    
    if (localTypes.some(type => type.value === typeValue)) {
      toast.error("Type already exists");
      return;
    }

    const updatedTypes = [...localTypes, { value: typeValue, label: newType.trim() }];
    setLocalTypes(updatedTypes);
    setNewType("");
    toast.success("Type added");
  };

  const handleDeleteType = (index: number) => {
    const updatedTypes = localTypes.filter((_, i) => i !== index);
    setLocalTypes(updatedTypes);
    toast.success("Type deleted");
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(localTypes[index].label);
  };

  const handleSaveEdit = (index: number) => {
    if (!editingValue.trim()) {
      toast.error("Type name cannot be empty");
      return;
    }

    const updatedTypes = [...localTypes];
    updatedTypes[index] = {
      value: editingValue.toLowerCase().replace(/\s+/g, '_'),
      label: editingValue.trim()
    };
    setLocalTypes(updatedTypes);
    setEditingIndex(null);
    setEditingValue("");
    toast.success("Type updated");
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue("");
  };

  const handleSave = () => {
    onTypesChange(localTypes);
    localStorage.setItem('procedureTypes', JSON.stringify(localTypes));
    toast.success("Types saved successfully");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Procedure Types</DialogTitle>
          <DialogDescription>
            Add, edit, or remove procedure types for your practice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Type */}
          <div className="space-y-2">
            <Label>Add New Type</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter type name..."
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddType()}
              />
              <Button onClick={handleAddType}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Existing Types */}
          <div className="space-y-2">
            <Label>Existing Types ({localTypes.length})</Label>
            <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg p-4">
              {localTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No types added yet. Add your first type above.
                </p>
              ) : (
                localTypes.map((type, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    {editingIndex === index ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(index)}
                          className="flex-1"
                        />
                        <Button size="sm" onClick={() => handleSaveEdit(index)}>
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{type.label}</Badge>
                          <span className="text-xs text-muted-foreground">({type.value})</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartEdit(index)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteType(index)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageTypesModal;
