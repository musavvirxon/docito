// File: src/components/verification/EntityFileManager.tsx

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface EntityFileManagerProps {
  entityType: "practice" | "lab" | "imaging" | "pharmacy";
  entityId: string;
  heading?: string;
}

export default function EntityFileManager({
  entityType,
  entityId,
  heading = "Verification Documents",
}: EntityFileManagerProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    setUploading(true);
    // Placeholder for file upload logic
    await new Promise((r) => setTimeout(r, 1000));
    toast.info("File upload coming soon");
    setUploading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {heading}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload verification documents for your {entityType}. Supported formats: PDF, JPG, PNG.
        </p>

        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop files here, or click to select
          </p>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <FileUp className="h-4 w-4 mr-2" />
                Select Files
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Entity ID: {entityId}
        </div>
      </CardContent>
    </Card>
  );
}
