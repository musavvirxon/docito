import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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

const REQUIRED_TYPES = [
  "business_license",
  "tax_certificate",
  "professional_license",
  "insurance_certificate",
] as const;

export function VerificationDocumentsModal({
  open,
  onOpenChange,
  practiceId,
}: VerificationDocumentsModalProps) {
  const { t } = useTranslation("dashboard");
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const { uploadFile } = useFileUpload();

  useEffect(() => {
    if (open && practiceId) {
      fetchDocuments();
    }
  }, [open, practiceId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("verification_documents")
        .select("*")
        .eq("practice_id", practiceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      console.error("Error fetching documents:", err);
      toast.error(t("shell.verificationDocs.errors.loadFailed"));
    }
  };

  const handleFileUpload = async (documentType: string, file: File) => {
    if (!file) return;
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t("shell.verificationDocs.errors.invalidType"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("shell.verificationDocs.errors.tooLarge"));
      return;
    }

    setUploadingType(documentType);
    try {
      const uploadPath = `${practiceId}/${documentType}_${Date.now()}_${file.name}`;
      const result = await uploadFile(file, "medical-documents", uploadPath);
      if (!result) throw new Error(t("shell.verificationDocs.errors.uploadFailed"));

      const { error } = await supabase.from("verification_documents").insert({
        practice_id: practiceId,
        document_type: documentType,
        file_name: file.name,
        file_path: result.path,
        file_size: file.size,
        status: "pending",
      });
      if (error) throw error;

      toast.success(t("shell.verificationDocs.uploadSuccess"));
      fetchDocuments();
    } catch (err: any) {
      console.error("Error uploading document:", err);
      toast.error(err.message || t("shell.verificationDocs.errors.uploadFailedGeneric"));
    } finally {
      setUploadingType(null);
    }
  };

  const getDocumentStatus = (docType: string) => documents.find((d) => d.document_type === docType);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "rejected": return <XCircle className="w-4 h-4 text-red-600" />;
      case "pending": return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return <Upload className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="outline" className="bg-green-100 text-green-800">{t("shell.verificationDocs.status.approved")}</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800">{t("shell.verificationDocs.status.rejected")}</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">{t("shell.verificationDocs.status.pending")}</Badge>;
      default:
        return <Badge variant="outline">{t("shell.verificationDocs.status.notUploaded")}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("shell.verificationDocs.title")}</DialogTitle>
          <DialogDescription>{t("shell.verificationDocs.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {REQUIRED_TYPES.map((docType) => {
            const uploadedDoc = getDocumentStatus(docType);
            const isUploading = uploadingType === docType;
            return (
              <Card key={docType}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(uploadedDoc?.status)}
                        <h4 className="font-semibold">{t(`shell.verificationDocs.required.${docType}.label`)}</h4>
                        {getStatusBadge(uploadedDoc?.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {t(`shell.verificationDocs.required.${docType}.description`)}
                      </p>
                      {uploadedDoc && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="w-3 h-3" />
                          <span>{uploadedDoc.file_name}</span>
                        </div>
                      )}
                      {uploadedDoc?.rejection_reason && (
                        <p className="text-xs text-red-600 mt-2">
                          {t("shell.verificationDocs.rejectionReason", { reason: uploadedDoc.rejection_reason })}
                        </p>
                      )}
                    </div>

                    <div>
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        id={`file-${docType}`}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(docType, file);
                        }}
                        disabled={isUploading}
                      />
                      <Label htmlFor={`file-${docType}`}>
                        <Button
                          type="button"
                          variant={uploadedDoc?.status === "rejected" ? "destructive" : "outline"}
                          size="sm"
                          disabled={isUploading}
                          asChild
                        >
                          <span>
                            {isUploading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t("shell.verificationDocs.uploading")}
                              </>
                            ) : uploadedDoc ? (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                {t("shell.verificationDocs.reupload")}
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                {t("shell.verificationDocs.upload")}
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
          <p className="text-sm text-muted-foreground">{t("shell.verificationDocs.footerNote")}</p>
          <Button onClick={() => onOpenChange(false)}>{t("shell.verificationDocs.close")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
