import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Upload, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";

interface VerificationDocumentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  practiceId: string;
}

interface VerificationDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  status: string;
  rejection_reason?: string;
  created_at: string;
}

const requiredDocuments = [
  { type: "business_license", label: "Business License", description: "Valid business operating license" },
  { type: "tax_certificate", label: "Tax Certificate", description: "Tax registration document" },
  { type: "professional_license", label: "Professional License", description: "Medical/dental practice license" },
  { type: "insurance_certificate", label: "Insurance Certificate", description: "Professional liability insurance" },
];

export function VerificationDocumentsModal({ 
  open, 
  onOpenChange, 
  practiceId 
}: VerificationDocumentsModalProps) {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const { uploadFile, uploading } = useFileUpload();

  useEffect(() => {
    if (open && practiceId) {
      fetchDocuments();
    }
  }, [open, practiceId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('verification_documents')
        .select('*')
        .eq('practice_id', practiceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      toast.error("Failed to load documents");
    }
  };

  const handleFileUpload = async (documentType: string, file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload PDF, JPG, or PNG files only");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploadingType(documentType);
    try {
      // Upload to storage with practice ID as folder
      const uploadPath = `${practiceId}/${documentType}_${Date.now()}_${file.name}`;
      const result = await uploadFile(file, 'medical-documents', uploadPath);

      if (!result) {
        throw new Error("Failed to upload file");
      }

      // Save to database
      const { error } = await supabase
        .from('verification_documents')
        .insert({
          practice_id: practiceId,
          document_type: documentType,
          file_name: file.name,
          file_path: result.path,
          file_size: file.size,
          status: 'pending'
        });

      if (error) throw error;

      toast.success("Document uploaded successfully");
      fetchDocuments();
    } catch (err: any) {
      console.error('Error uploading document:', err);
      toast.error(err.message || "Failed to upload document");
    } finally {
      setUploadingType(null);
    }
  };

  const getDocumentStatus = (docType: string) => {
    const doc = documents.find(d => d.document_type === docType);
    return doc;
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Upload className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending Review</Badge>;
      default:
        return <Badge variant="outline">Not Uploaded</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verification Documents</DialogTitle>
          <DialogDescription>
            Upload required documents for practice verification. All documents will be reviewed within 2-3 business days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {requiredDocuments.map((reqDoc) => {
            const uploadedDoc = getDocumentStatus(reqDoc.type);
            const isUploading = uploadingType === reqDoc.type;

            return (
              <Card key={reqDoc.type}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(uploadedDoc?.status)}
                        <h4 className="font-semibold">{reqDoc.label}</h4>
                        {getStatusBadge(uploadedDoc?.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {reqDoc.description}
                      </p>
                      {uploadedDoc && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="w-3 h-3" />
                          <span>{uploadedDoc.file_name}</span>
                        </div>
                      )}
                      {uploadedDoc?.rejection_reason && (
                        <p className="text-xs text-red-600 mt-2">
                          Rejection reason: {uploadedDoc.rejection_reason}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        id={`file-${reqDoc.type}`}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(reqDoc.type, file);
                        }}
                        disabled={isUploading}
                      />
                      <Label htmlFor={`file-${reqDoc.type}`}>
                        <Button
                          type="button"
                          variant={uploadedDoc?.status === 'rejected' ? 'destructive' : 'outline'}
                          size="sm"
                          disabled={isUploading}
                          asChild
                        >
                          <span>
                            {isUploading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : uploadedDoc ? (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Re-upload
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload
                              </>
                            )}
                          </span>
                        </Button>
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Accepted formats: PDF, JPG, PNG (max 5MB each)
          </p>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}