// File: src/components/verification/FacilityVerificationForm.tsx

import { useEffect, useMemo, useState } from "react";
import { FacilityType, useFacilityVerification } from "@/hooks/useFacilityVerification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Upload, Save, Send, Clock, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type DocReq = { type: string; label: string; description: string; required: boolean };

const DOCS: Record<FacilityType, DocReq[]> = {
  practice: [
    { type: "business_license", label: "Business License", description: "Operating license/permit", required: true },
    { type: "practice_license", label: "Practice License", description: "Medical/Dental practice license", required: true },
    { type: "tax_certificate", label: "Tax Certificate", description: "Tax registration document", required: true },
    { type: "insurance_certificate", label: "Insurance Certificate", description: "Professional liability insurance", required: true },
  ],
  pharmacy: [
    { type: "pharmacy_license", label: "Pharmacy License", description: "Operating license", required: true },
    { type: "business_license", label: "Business License", description: "Business permit", required: true },
    { type: "tax_certificate", label: "Tax Certificate", description: "Tax registration document", required: true },
    { type: "insurance_certificate", label: "Insurance Certificate", description: "Liability insurance", required: false },
  ],
  lab: [
    { type: "lab_license", label: "Lab License", description: "Operating license", required: true },
    { type: "accreditation", label: "Accreditation", description: "Accreditation certificate", required: false },
    { type: "tax_certificate", label: "Tax Certificate", description: "Tax registration document", required: true },
    { type: "quality_certificate", label: "Quality Certificate", description: "Quality/ISO certificate (if any)", required: false },
  ],
  imaging: [
    { type: "imaging_license", label: "Imaging License", description: "Operating license", required: true },
    { type: "radiology_cert", label: "Radiology Certificate", description: "Radiology compliance document", required: false },
    { type: "tax_certificate", label: "Tax Certificate", description: "Tax registration document", required: true },
    { type: "insurance_certificate", label: "Insurance Certificate", description: "Liability insurance", required: false },
  ],
};

export default function FacilityVerificationForm(props: {
  title: string;
  facilityType: FacilityType;
  facilityId: string;
  entityName?: string | null;
  entityVerified?: boolean;
  onBack?: () => void;
  onUpdateDetails?: () => void;
}) {
  const { title, facilityType, facilityId, entityName, entityVerified, onBack, onUpdateDetails } = props;

  const { loading, uploading, draft, activeRequest, documents, refresh, saveDraft, submit, uploadDocument } =
    useFacilityVerification(facilityType, facilityId);

  const [payload, setPayload] = useState<Record<string, any>>({
    legal_name: "",
    license_number: "",
    accreditation: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    notes: "",
  });

  const [comment, setComment] = useState("");

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  useEffect(() => {
    if (draft?.payload) {
      setPayload((prev) => ({ ...prev, ...(draft.payload || {}) }));
    }
  }, [draft?.id]);

  const reqStatus = useMemo(() => {
    if (entityVerified) return "verified";
    if (!activeRequest) return "none";
    return activeRequest.status;
  }, [activeRequest, entityVerified]);

  const statusBadge = useMemo(() => {
    if (reqStatus === "verified") {
      return (
        <Badge className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Verified
        </Badge>
      );
    }
    if (reqStatus === "submitted" || reqStatus === "in_review") {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          {reqStatus === "submitted" ? "Submitted" : "In Review"}
        </Badge>
      );
    }
    if (reqStatus === "rejected") {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    }
    return <Badge variant="outline">Not Submitted</Badge>;
  }, [reqStatus]);

  const docReqs = DOCS[facilityType];

  const uploadedMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const d of documents) map.set(d.document_type, d);
    return map;
  }, [documents]);

  const missingRequired = useMemo(() => {
    return docReqs
      .filter((d) => d.required)
      .some((d) => !uploadedMap.get(d.type));
  }, [docReqs, uploadedMap]);

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground truncate">
            {entityName ? entityName : "Facility"} • {facilityType.toUpperCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge}
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Draft information</CardTitle>
          <p className="text-sm text-muted-foreground">
            Save draft anytime. Submit when ready. Draft is stored in Supabase (not local/mock).
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Legal name</Label>
              <Input
                value={payload.legal_name || ""}
                onChange={(e) => setPayload((p) => ({ ...p, legal_name: e.target.value }))}
                placeholder="Registered legal business name"
              />
            </div>
            <div className="space-y-2">
              <Label>License number</Label>
              <Input
                value={payload.license_number || ""}
                onChange={(e) => setPayload((p) => ({ ...p, license_number: e.target.value }))}
                placeholder="License / registration number"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact email</Label>
              <Input
                value={payload.contact_email || ""}
                onChange={(e) => setPayload((p) => ({ ...p, contact_email: e.target.value }))}
                placeholder="contact@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact phone</Label>
              <Input
                value={payload.contact_phone || ""}
                onChange={(e) => setPayload((p) => ({ ...p, contact_phone: e.target.value }))}
                placeholder="+998..."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Input
                value={payload.address || ""}
                onChange={(e) => setPayload((p) => ({ ...p, address: e.target.value }))}
                placeholder="Full facility address"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Accreditation (optional)</Label>
              <Input
                value={payload.accreditation || ""}
                onChange={(e) => setPayload((p) => ({ ...p, accreditation: e.target.value }))}
                placeholder="Accreditation / ISO / other"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={payload.notes || ""}
                onChange={(e) => setPayload((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Anything reviewers should know"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => saveDraft(payload)}
              disabled={loading}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save draft"}
            </Button>

            {onUpdateDetails && (
              <Button variant="outline" onClick={onUpdateDetails}>
                Update facility details
              </Button>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold">Documents</h3>
              <p className="text-sm text-muted-foreground">
                Upload required docs. Stored in Supabase Storage + verification_documents table.
              </p>
            </div>

            <div className="space-y-3">
              {docReqs.map((d) => {
                const uploaded = uploadedMap.get(d.type);
                const status = uploaded?.status || (uploaded ? "pending" : null);
                return (
                  <div
                    key={d.type}
                    className={cn(
                      "border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3",
                      uploaded ? "bg-muted/30" : "bg-background"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{d.label}</span>
                        {d.required ? (
                          <Badge variant="secondary">Required</Badge>
                        ) : (
                          <Badge variant="outline">Optional</Badge>
                        )}
                        {uploaded ? (
                          <Badge variant="outline" className="capitalize">
                            {status}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not uploaded</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{d.description}</p>
                      {uploaded?.rejection_reason ? (
                        <p className="text-sm text-red-500 mt-1">{uploaded.rejection_reason}</p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="inline-flex">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadDocument(d.type, f);
                            e.currentTarget.value = "";
                          }}
                          disabled={uploading}
                        />
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 cursor-pointer select-none",
                            "px-3 py-2 rounded-md border bg-background hover:bg-muted transition",
                            uploading && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          <Upload className="h-4 w-4" />
                          {uploading ? "Uploading..." : uploaded ? "Replace" : "Upload"}
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Submission comment (optional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Short note for reviewer"
            />
          </div>

          {activeRequest?.status === "rejected" && activeRequest?.rejection_reason ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <div className="font-medium">Rejected</div>
              <div className="mt-1">{activeRequest.rejection_reason}</div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => submit(payload, comment)}
              disabled={loading || entityVerified || (activeRequest && ["submitted", "in_review"].includes(activeRequest.status))}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {loading ? "Submitting..." : entityVerified ? "Already Verified" : "Submit for review"}
            </Button>

            {missingRequired ? (
              <p className="text-sm text-muted-foreground self-center">
                Upload required documents before submitting.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
