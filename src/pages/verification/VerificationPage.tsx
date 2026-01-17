// Path: src/pages/verification/VerificationPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Send, Upload, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useStaffContext } from "@/hooks/useStaffContext";
import { useVerificationFiles, type EntityType } from "@/hooks/useVerificationFiles";
import { Input } from "@/components/ui/input";

type DraftRow = {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  submitted_by: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  payload: any;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

function safeStringify(v: unknown) {
  try {
    return JSON.stringify(v ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export default function VerificationPage() {
  const { entityType: entityTypeParam } = useParams();
  const entityType = (entityTypeParam || "clinic") as EntityType;

  const { permissions, entityInfo, staffType, loading: ctxLoading } = useStaffContext();
  const entityId = (permissions as any)?.entity_id || entityInfo?.id || null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftRow | null>(null);
  const [jsonText, setJsonText] = useState<string>("{}");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { loading: filesLoading, files, error: filesError, actions: fileActions } = useVerificationFiles({
    entityType,
    entityId,
    submissionId: draft?.id ?? null,
  });

  const canSubmit = useMemo(() => Boolean(entityId), [entityId]);

  const title = useMemo(() => {
    if (entityType === "clinic") return "Clinic Verification";
    if (entityType === "lab") return "Lab Verification";
    if (entityType === "imaging") return "Imaging Verification";
    return "Pharmacy Verification";
  }, [entityType]);

  const badgeVariant = useMemo(() => {
    const st = (draft?.status || "draft").toLowerCase();
    if (st === "approved" || st === "verified") return "default";
    if (st === "submitted" || st === "pending") return "secondary";
    if (st === "rejected") return "destructive";
    return "outline";
  }, [draft?.status]);

  const loadDraft = async () => {
    if (!entityId) {
      setDraft(null);
      setJsonText("{}");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verification-submit", {
        body: { action: "get_draft", entityType, entityId },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to load draft");

      const d = (data.draft || null) as DraftRow | null;
      setDraft(d);
      setJsonText(safeStringify(d?.payload ?? {}));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load verification draft");
      setDraft(null);
      setJsonText("{}");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ctxLoading) return;
    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxLoading, entityId, entityType]);

  const saveDraft = async () => {
    if (!entityId) return;
    const parsed = safeParse(jsonText);
    if (parsed === null) {
      toast.error("Invalid JSON payload. Fix formatting first.");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("verification-submit", {
        body: { action: "save_draft", entityType, entityId, payload: parsed },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to save draft");

      setDraft(data.draft as DraftRow);
      toast.success("Draft saved");

      // Ensure file list rebinds to draft id
      await fileActions.refetch();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!entityId) return;
    const parsed = safeParse(jsonText);
    if (parsed === null) {
      toast.error("Invalid JSON payload. Fix formatting first.");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("verification-submit", {
        body: { action: "submit", entityType, entityId, payload: parsed },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to submit");

      toast.success("Verification submitted");
      await loadDraft();
      await fileActions.refetch();
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  const chooseFiles = () => {
    fileInputRef.current?.click();
  };

  const onFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (picked.length === 0) return;

    if (!entityId) {
      toast.error("No entity scope");
      return;
    }

    // Ensure draft exists so we can attach files to submissionId
    if (!draft?.id) {
      toast.message("Saving draft first…");
      await saveDraft();
    }

    const filesToUpload = picked.slice(0, 10);
    for (const f of filesToUpload) {
      try {
        await fileActions.uploadFile(f);
        toast.success(`Uploaded: ${f.name}`);
      } catch (err: any) {
        toast.error(err?.message || `Upload failed: ${f.name}`);
      }
    }

    await fileActions.refetch();
  };

  const removeFile = async (id: string) => {
    try {
      await fileActions.removeFile(id);
      toast.success("File removed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove file");
    }
  };

  if (ctxLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!entityId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No entity scope resolved for this account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Ask your admin to invite you to the correct clinic/lab/imaging center/pharmacy.
          </div>
        </CardContent>
      </Card>
    );
  }

  const isSubmitted = (draft?.status || "draft") !== "draft";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                {title}
                <Badge variant={badgeVariant as any}>{draft?.status || "draft"}</Badge>
              </CardTitle>
              <CardDescription>Draft payload is allowed. Save draft anytime; submit when ready.</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={saveDraft} disabled={saving || isSubmitted}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Draft
              </Button>

              <Button onClick={submit} disabled={saving || !canSubmit || isSubmitted}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Submit
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Scope: <span className="font-medium">{staffType}</span> • Entity: <span className="font-medium">{entityId}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="text-sm font-medium">Draft JSON Payload</div>
            <Textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={14}
              placeholder='{"license":"...", "documents":[...]}'
              disabled={isSubmitted}
            />
            <div className="text-xs text-muted-foreground">
              This remains flexible for now. In later phases, we can enforce schema + validation.
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Documents</div>
                <div className="text-xs text-muted-foreground">
                  Upload PDF/images/docs. Files are private and entity-scoped.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/png,image/jpeg,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={onFilesSelected}
                  disabled={isSubmitted}
                />
                <Button variant="outline" onClick={chooseFiles} disabled={saving || filesLoading || isSubmitted}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
                <Button variant="outline" onClick={fileActions.refetch} disabled={filesLoading}>
                  {filesLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Refresh
                </Button>
              </div>
            </div>

            {filesError ? <div className="text-sm text-destructive">{filesError}</div> : null}

            {filesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : files.length === 0 ? (
              <div className="text-sm text-muted-foreground">No documents uploaded yet.</div>
            ) : (
              <div className="space-y-2">
                {files.map((f) => (
                  <div key={f.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border p-3">
                    <div className="space-y-1">
                      <div className="font-medium">{f.file_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {f.mime_type || "file"} • {typeof f.size_bytes === "number" ? `${Math.round(f.size_bytes / 1024)} KB` : "—"} •{" "}
                        {new Date(f.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (f.downloadUrl) window.open(f.downloadUrl, "_blank");
                          else toast.error("Download URL not available. Refresh and try again.");
                        }}
                      >
                        View <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeFile(f.id)}
                        disabled={saving || isSubmitted}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
