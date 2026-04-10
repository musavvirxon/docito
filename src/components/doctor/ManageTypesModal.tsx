import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { z } from "zod";

interface Type {
  value: string;
  label: string;
}

interface ManageTypesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  types: Type[];
  onTypesChange: (types: Type[]) => void;
  defaultTypes?: Type[];
}

const typeSchema = z.object({
  value: z.string().trim().min(1, "Type value is required").max(50, "Max 50 characters"),
  label: z.string().trim().min(1, "Type label is required").max(100, "Max 100 characters")
});

const ManageTypesModal = ({ 
  open, 
  onOpenChange, 
  types, 
  onTypesChange,
  defaultTypes = []
}: ManageTypesModalProps) => {
  const [localTypes, setLocalTypes] = useState<Type[]>(types);
  const [newType, setNewType] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  useEffect(() => {
    setLocalTypes(types);
  }, [types]);

  const handleAddType = () => {
    const trimmedValue = newType.trim().toLowerCase().replace(/\s+/g, '_');
    const trimmedLabel = newType.trim();

    try {
      typeSchema.parse({ value: trimmedValue, label: trimmedLabel });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
        return;
      }
    }

    // Check if exists in custom types
    if (localTypes.some(type => type.value === trimmedValue)) {
      toast.error("Type already exists in custom types");
      return;
    }

    // Check if exists in default types
    if (defaultTypes.some(type => type.value === trimmedValue)) {
      toast.error("Type already exists in default types");
      return;
    }

    const updatedTypes = [...localTypes, { value: trimmedValue, label: trimmedLabel }];
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
    const trimmedValue = editingValue.trim().toLowerCase().replace(/\s+/g, '_');
    const trimmedLabel = editingValue.trim();

    try {
      typeSchema.parse({ value: trimmedValue, label: trimmedLabel });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
        return;
      }
    }

    const updatedTypes = [...localTypes];
    updatedTypes[index] = {
      value: trimmedValue,
      label: trimmedLabel
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
    toast.success("Types saved successfully");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Procedure Types</DialogTitle>
          <DialogDescription>
            Add custom types in addition to the default ones. Custom types can be edited or deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Type */}
          <div className="space-y-2">
            <Label>Add Custom Type</Label>
            <p className="text-sm text-muted-foreground">
              Custom types will be saved to your browser and available across sessions.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter type name..."
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddType()}
                maxLength={100}
              />
              <Button onClick={handleAddType}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Default Types (Read-only) */}
          <div className="space-y-2">
            <Label>Default Types ({defaultTypes.length})</Label>
            <p className="text-sm text-muted-foreground">These types are built-in and cannot be modified.</p>
            <div className="flex flex-wrap gap-2 border rounded-lg p-4 bg-muted/20">
              {defaultTypes.map((type) => (
                <Badge key={type.value} variant="secondary">
                  {type.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Custom Types (Editable) */}
          <div className="space-y-2">
            <Label>Custom Types ({localTypes.length})</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-4">
              {localTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No custom types added yet. Add your first type above.
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
                          maxLength={100}
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
                          <Badge variant="default">{type.label}</Badge>
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
