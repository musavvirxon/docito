import { useState, useEffect } from "react";
import { Upload, Download, Trash2, FileText, Image, File, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FileAttachment {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  attachment_type: string;
  uploaded_by: string;
  uploaded_at: string;
  file_url?: string;
}

interface FileAttachmentSectionProps {
  treatmentPlanId?: string;
  procedureId?: string;
  patientId?: string;
  title?: string;
}

const FileAttachmentSection = ({ 
  treatmentPlanId, 
  procedureId, 
  patientId,
  title = "File Attachments"
}: FileAttachmentSectionProps) => {
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const attachmentTypes = [
    { value: "xray", label: "X-Ray" },
    { value: "lab_result", label: "Lab Result" },
    { value: "report", label: "Report" },
    { value: "photo", label: "Photo" },
    { value: "document", label: "Document" },
    { value: "other", label: "Other" }
  ];

  useEffect(() => {
    fetchFiles();
  }, [treatmentPlanId, procedureId, patientId]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      // In a real app, you'd query the file_attachments table
      // For now, we'll use mock data
      const mockFiles: FileAttachment[] = [
        {
          id: "file1",
          filename: "dental_xray_001.jpg",
          file_type: "image/jpeg",
          file_size: 2048000,
          attachment_type: "xray",
          uploaded_by: "Dr. Smith",
          uploaded_at: new Date().toISOString(),
        },
        {
          id: "file2",
          filename: "lab_report_bloodwork.pdf",
          file_type: "application/pdf",
          file_size: 1536000,
          attachment_type: "lab_result",
          uploaded_by: "Lab Tech",
          uploaded_at: new Date().toISOString(),
        }
      ];
      
      setFiles(mockFiles);
    } catch (error: any) {
      toast.error("Failed to load files: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, attachmentType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // In a real app, you'd upload to Supabase Storage
      // For now, we'll simulate the upload
      const mockFile: FileAttachment = {
        id: `file_${Date.now()}`,
        filename: file.name,
        file_type: file.type,
        file_size: file.size,
        attachment_type: attachmentType,
        uploaded_by: "Current User",
        uploaded_at: new Date().toISOString(),
      };

      setFiles(prev => [mockFile, ...prev]);
      toast.success("File uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload file: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success("File deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete file: " + error.message);
    }
  };

  const handleDownloadFile = (file: FileAttachment) => {
    // In a real app, you'd download from Supabase Storage
    toast.success(`Downloading ${file.filename}...`);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return <Image className="w-5 h-5 text-blue-600" />;
    } else if (fileType === "application/pdf") {
      return <FileText className="w-5 h-5 text-red-600" />;
    } else {
      return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAttachmentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      xray: "bg-blue-100 text-blue-800",
      lab_result: "bg-green-100 text-green-800",
      report: "bg-purple-100 text-purple-800",
      photo: "bg-pink-100 text-pink-800",
      document: "bg-gray-100 text-gray-800",
      other: "bg-orange-100 text-orange-800"
    };
    return colors[type] || colors.other;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {title}
          </CardTitle>
          <Badge variant="outline">{files.length} file{files.length !== 1 ? 's' : ''}</Badge>
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
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById(`upload-${type.value}`)?.click()}
                  disabled={uploading}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Files List */}
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading files...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No files uploaded yet</p>
            <p className="text-sm">Upload files using the buttons above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {getFileIcon(file.file_type)}
                  <div>
                    <p className="font-medium text-sm">{file.filename}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>•</span>
                      <span>by {file.uploaded_by}</span>
                      <span>•</span>
                      <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getAttachmentTypeColor(file.attachment_type)}>
                    {attachmentTypes.find(t => t.value === file.attachment_type)?.label}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadFile(file)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteFile(file.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FileAttachmentSection;