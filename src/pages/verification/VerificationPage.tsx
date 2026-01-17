// Path: src/pages/verification/VerificationPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { useStaffContext } from "@/hooks/useStaffContext";

type EntityType = "clinic" | "lab" | "imaging" | "pharmacy";

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

  const canSubmit = useMemo(() => {
    // Phase 5: keep permissive. Admin-only submit can be enforced later.
    // If the viewer has entity_id resolved, allow submit.
    return Boolean(entityId);
  }, [entityId]);

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
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit");
    } finally {
      setSaving(false);
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
              <CardDescription>
                Draft payload is allowed. Save draft anytime; submit when ready.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={saveDraft} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Draft
              </Button>

              <Button onClick={submit} disabled={saving || !canSubmit}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Submit
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Scope: <span className="font-medium">{staffType}</span> • Entity:{" "}
            <span className="font-medium">{entityId}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="text-sm font-medium">Draft JSON Payload</div>
          <Textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={18}
            placeholder='{"license":"...", "documents":[...]}'
          />
          <div className="text-xs text-muted-foreground">
            This is intentionally flexible during build. Later we can enforce schema validation and file uploads.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
