import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Category {
  value: string;
  label: string;
}

interface ManageCategoriesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onCategoriesChange: (categories: Category[]) => void;
}

const ManageCategoriesModal = ({ open, onOpenChange, categories, onCategoriesChange }: ManageCategoriesModalProps) => {
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [newCategory, setNewCategory] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }

    const categoryValue = newCategory.toLowerCase().replace(/\s+/g, '_');
    
    if (localCategories.some(cat => cat.value === categoryValue)) {
      toast.error("Category already exists");
      return;
    }

    const updatedCategories = [...localCategories, { value: categoryValue, label: newCategory.trim() }];
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
    if (!editingValue.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }

    const updatedCategories = [...localCategories];
    updatedCategories[index] = {
      value: editingValue.toLowerCase().replace(/\s+/g, '_'),
      label: editingValue.trim()
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
    localStorage.setItem('procedureCategories', JSON.stringify(localCategories));
    toast.success("Categories saved successfully");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Procedure Categories</DialogTitle>
          <DialogDescription>
            Add, edit, or remove procedure categories for your practice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Category */}
          <div className="space-y-2">
            <Label>Add New Category</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter category name..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <Button onClick={handleAddCategory}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Existing Categories */}
          <div className="space-y-2">
            <Label>Existing Categories ({localCategories.length})</Label>
            <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg p-4">
              {localCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No categories added yet. Add your first category above.
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
                          <Badge variant="secondary">{category.label}</Badge>
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
