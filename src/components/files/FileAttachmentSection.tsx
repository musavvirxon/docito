import { useState } from "react";
import { Upload, Download, Trash2, FileText, Image, File, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface FileAttachmentSectionProps {
  treatmentPlanId?: string;
  procedureId?: string;
  patientId?: string;
  contextType?: string;
  contextId?: string;
  title?: string;
}

const FileAttachmentSection = ({ 
  treatmentPlanId, 
  procedureId, 
  patientId,
  contextType,
  contextId,
  title = "File Attachments"
}: FileAttachmentSectionProps) => {
  const [uploading, setUploading] = useState(false);

  const attachmentTypes = [
    { value: "xray", label: "X-Ray" },
    { value: "lab_result", label: "Lab Result" },
    { value: "report", label: "Report" },
    { value: "photo", label: "Photo" },
    { value: "document", label: "Document" },
    { value: "other", label: "Other" }
  ];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, attachmentType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // File upload requires storage bucket configuration
      toast.info("File upload feature coming soon");
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {title}
          </CardTitle>
          <Badge variant="outline">0 files</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {attachmentTypes.map((type) => (
            <div key={type.value} className="border-2 border-dashed border-muted rounded-lg p-4">
              <Label className="text-sm font-medium mb-2 block">{type.label}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept={type.value === 'photo' ? 'image/*' : type.value === 'xray' ? 'image/*' : '*/*'}
                  onChange={(e) => handleFileUpload(e, type.value)}
                  className="hidden"
                  id={`upload-${type.value}`}
                  disabled={uploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById(`upload-${type.value}`)?.click()}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No files uploaded yet</p>
          <p className="text-sm">File storage feature coming soon</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileAttachmentSection;
