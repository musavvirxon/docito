import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Minus, Upload, FileText } from "lucide-react";

interface Material {
  name: string;
  quantity: number;
  required: boolean;
  notes?: string;
}

interface UploadedFile {
  name: string;
  url: string;
  type: string;
}

interface MaterialsToolsSectionProps {
  materials: Material[];
  onAddMaterial: () => void;
  onRemoveMaterial: (index: number) => void;
  onUpdateMaterial: (index: number, field: string, value: any) => void;
  uploadedFiles: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
}

export const MaterialsToolsSection = ({
  materials,
  onAddMaterial,
  onRemoveMaterial,
  onUpdateMaterial,
  uploadedFiles,
  onFilesChange,
}: MaterialsToolsSectionProps) => {
  return (
    <div className="space-y-6">
      {/* Materials Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Materials & Tools Required
            <Button type="button" onClick={onAddMaterial} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Material
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {materials.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No materials added yet. Click "Add Material" to get started.
              </p>
            ) : (
              materials.map((material, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-start p-4 border rounded-lg">
                  <div className="col-span-4">
                    <Label>Material/Tool Name</Label>
                    <Input
                      value={material.name}
                      onChange={(e) => onUpdateMaterial(index, 'name', e.target.value)}
                      placeholder="e.g., Surgical gloves, Scalpel"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={material.quantity}
                      onChange={(e) => onUpdateMaterial(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  
                  <div className="col-span-1 flex items-end pb-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`required-${index}`}
                        checked={material.required}
                        onCheckedChange={(checked) => onUpdateMaterial(index, 'required', checked === true)}
                      />
                      <Label htmlFor={`required-${index}`} className="text-sm">
                        Required
                      </Label>
                    </div>
                  </div>
                  
                  <div className="col-span-4">
                    <Label>Notes</Label>
                    <Input
                      value={material.notes || ''}
                      onChange={(e) => onUpdateMaterial(index, 'notes', e.target.value)}
                      placeholder="Additional notes..."
                    />
                  </div>
                  
                  <div className="col-span-1 flex items-end pb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRemoveMaterial(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Files Section */}
      <Card>
        <CardHeader>
          <CardTitle>Procedure Documents & Images</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Upload images, guides, or safety notices for this procedure
              </p>
              <Button type="button" variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Choose Files
              </Button>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const updated = uploadedFiles.filter((_, i) => i !== index);
                        onFilesChange(updated);
                      }}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};