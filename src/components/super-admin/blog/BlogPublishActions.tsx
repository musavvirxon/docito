import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BlogStudioDraft } from "@/lib/blog/studio-api";
import type { BlogGroupChecklistResult } from "@/types/blog";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  Rocket,
  Save,
  Sparkles,
} from "lucide-react";

interface BlogPublishActionsProps {
  draft: BlogStudioDraft | null;
  checklist: BlogGroupChecklistResult | null;
  isPublishing: boolean;
  isSavingDraft?: boolean;
  onAutofillAll: () => void;
  onPublish: () => void;
  onSaveDraft?: () => void;
}

export default function BlogPublishActions({
  draft,
  checklist,
  isPublishing,
  isSavingDraft,
  onAutofillAll,
  onPublish,
  onSaveDraft,
}: BlogPublishActionsProps) {
  if (!draft || !checklist) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Publish actions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Open a draft to see publish blockers and submit controls.
        </CardContent>
      </Card>
    );
  }

  const blockedReasons = [
    ...checklist.global.missingKeys.map((key) => `global:${key}`),
    ...checklist.requiredLanguages
      .filter((lang) => !checklist.languages[lang].passed)
      .map((lang) => `${lang}:${checklist.languages[lang].missingKeys.join(", ")}`),
  ];

  const publishDisabled = !checklist.passed || isPublishing || isSavingDraft;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="space-y-3">
        <CardTitle className="text-base">Publish actions</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className={
              checklist.passed
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                : "border-destructive/20 bg-destructive/10 text-destructive"
            }
          >
            {checklist.passed ? (
              <>
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Gate passed
              </>
            ) : (
              <>
                <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                Gate blocked
              </>
            )}
          </Badge>

          <Badge variant="outline">
            <Database className="mr-1 h-3.5 w-3.5" />
            Direct publish
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border p-4">
          <div className="mb-2 text-sm font-semibold text-foreground">Publish flow</div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>1. Edit content & fill SEO fields</div>
            <div>2. Save as draft to persist to database</div>
            <div>3. Pass every required checklist item</div>
            <div>4. Publish directly to make it live</div>
          </div>
        </div>

        {!checklist.passed ? (
          <div className="space-y-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
            <div className="text-sm font-semibold text-destructive">Current blockers</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              {blockedReasons.map((reason) => (
                <div key={reason}>• {reason}</div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-300">
            Every required language and global rule is satisfied. This draft can be published.
          </div>
        )}

        <div className="grid gap-3">
          <Button type="button" variant="outline" onClick={onAutofillAll}>
            <Sparkles className="mr-2 h-4 w-4" />
            Autofill missing SEO fields
          </Button>

          {onSaveDraft && (
            <Button
              type="button"
              variant="secondary"
              disabled={isSavingDraft || isPublishing}
              onClick={onSaveDraft}
            >
              {isSavingDraft ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save as draft
                </>
              )}
            </Button>
          )}

          <Button type="button" disabled={publishDisabled} onClick={onPublish}>
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                Publish now
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
