import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { z } from "zod";

interface Category {
  value: string;
  label: string;
}

interface ManageCategoriesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onCategoriesChange: (categories: Category[]) => void;
  defaultCategories?: Category[];
}

const categorySchema = z.object({
  value: z.string().trim().min(1, "Category value is required").max(50, "Max 50 characters"),
  label: z.string().trim().min(1, "Category label is required").max(100, "Max 100 characters")
});

const ManageCategoriesModal = ({ 
  open, 
  onOpenChange, 
  categories, 
  onCategoriesChange,
  defaultCategories = []
}: ManageCategoriesModalProps) => {
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [newCategory, setNewCategory] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const handleAddCategory = () => {
    const trimmedValue = newCategory.trim().toLowerCase().replace(/\s+/g, '_');
    const trimmedLabel = newCategory.trim();

    try {
      categorySchema.parse({ value: trimmedValue, label: trimmedLabel });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
        return;
      }
    }

    // Check if exists in custom categories
    if (localCategories.some(cat => cat.value === trimmedValue)) {
      toast.error("Category already exists in custom categories");
      return;
    }

    // Check if exists in default categories
    if (defaultCategories.some(cat => cat.value === trimmedValue)) {
      toast.error("Category already exists in default categories");
      return;
    }

    const updatedCategories = [...localCategories, { value: trimmedValue, label: trimmedLabel }];
    setLocalCategories(updatedCategories);
    setNewCategory("");
    toast.success("Category added");
  };

  const handleDeleteCategory = (index: number) => {
    const updatedCategories = localCategories.filter((_, i) => i !== index);
    setLocalCategories(updatedCategories);
    toast.success("Category deleted");
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(localCategories[index].label);
  };

  const handleSaveEdit = (index: number) => {
    const trimmedValue = editingValue.trim().toLowerCase().replace(/\s+/g, '_');
    const trimmedLabel = editingValue.trim();

    try {
      categorySchema.parse({ value: trimmedValue, label: trimmedLabel });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
        return;
      }
    }

    const updatedCategories = [...localCategories];
    updatedCategories[index] = {
      value: trimmedValue,
      label: trimmedLabel
    };
    setLocalCategories(updatedCategories);
    setEditingIndex(null);
    setEditingValue("");
    toast.success("Category updated");
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue("");
  };

  const handleSave = () => {
    onCategoriesChange(localCategories);
    toast.success("Categories saved successfully");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Procedure Categories</DialogTitle>
          <DialogDescription>
            Add custom categories in addition to the default ones. Custom categories can be edited or deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Category */}
          <div className="space-y-2">
            <Label>Add Custom Category</Label>
            <p className="text-sm text-muted-foreground">
              Custom categories will be saved to your browser and available across sessions.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter category name..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                maxLength={100}
              />
              <Button onClick={handleAddCategory}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Default Categories (Read-only) */}
          <div className="space-y-2">
            <Label>Default Categories ({defaultCategories.length})</Label>
            <p className="text-sm text-muted-foreground">These categories are built-in and cannot be modified.</p>
            <div className="flex flex-wrap gap-2 border rounded-lg p-4 bg-muted/20">
              {defaultCategories.map((category) => (
                <Badge key={category.value} variant="secondary">
                  {category.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Custom Categories (Editable) */}
          <div className="space-y-2">
            <Label>Custom Categories ({localCategories.length})</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-4">
              {localCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No custom categories added yet. Add your first category above.
                </p>
              ) : (
                localCategories.map((category, index) => (
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
                          <Badge variant="default">{category.label}</Badge>
                          <span className="text-xs text-muted-foreground">({category.value})</span>
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
                            onClick={() => handleDeleteCategory(index)}
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

export default ManageCategoriesModal;
