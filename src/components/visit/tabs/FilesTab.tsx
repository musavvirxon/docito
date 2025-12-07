import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload,
  Trash2,
  FileText,
  Image,
  File,
  Download,
  Eye,
  X,
  FolderOpen,
} from "lucide-react";
import { VisitFile, VisitMode } from "../types";
import { format } from "date-fns";

interface FilesTabProps {
  files: VisitFile[];
  mode: VisitMode;
  onUpload: (files: FileList) => void;
  onDelete: (id: string) => void;
  onDownload: (file: VisitFile) => void;
}

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) {
    return <Image className="h-8 w-8 text-blue-500" />;
  }
  if (type === "application/pdf") {
    return <FileText className="h-8 w-8 text-red-500" />;
  }
  return <File className="h-8 w-8 text-muted-foreground" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getCategoryColor = (category?: string) => {
  switch (category?.toLowerCase()) {
    case "xray":
    case "x-ray":
      return "bg-purple-100 text-purple-800";
    case "lab":
    case "lab_result":
      return "bg-green-100 text-green-800";
    case "prescription":
      return "bg-blue-100 text-blue-800";
    case "photo":
    case "image":
      return "bg-pink-100 text-pink-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const FilesTab = ({
  files,
  mode,
  onUpload,
  onDelete,
  onDownload,
}: FilesTabProps) => {
  const [previewFile, setPreviewFile] = useState<VisitFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditable = mode === "current";

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isEditable) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isEditable && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Files & Documents</h2>
          <p className="text-sm text-muted-foreground">
            X-rays, lab results, images, and other documents
          </p>
        </div>
        {isEditable && (
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Files
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*,.pdf,.doc,.docx"
        onChange={handleFileSelect}
      />

      {/* Drag & Drop Zone */}
      {isEditable && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
          `}
        >
          <Upload className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            Drag and drop files here, or{" "}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-primary underline hover:no-underline"
            >
              browse
            </button>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports: PDF, Images, X-rays, Documents
          </p>
        </div>
      )}

      {files.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No files uploaded yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <Card key={file.id} className="group relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {file.type.startsWith("image/") && file.url ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      {getFileIcon(file.type)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(file.uploadedAt), "PP")}
                    </p>
                    {file.category && (
                      <Badge
                        variant="secondary"
                        className={`mt-1.5 text-xs ${getCategoryColor(file.category)}`}
                      >
                        {file.category}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {(file.type.startsWith("image/") || file.type === "application/pdf") && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPreviewFile(file)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onDownload(file)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {isEditable && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onDelete(file.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{previewFile?.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewFile?.type.startsWith("image/") && previewFile.url && (
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="max-w-full h-auto mx-auto"
              />
            )}
            {previewFile?.type === "application/pdf" && previewFile.url && (
              <iframe
                src={previewFile.url}
                className="w-full h-[70vh]"
                title={previewFile.name}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
