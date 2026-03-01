import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BlogGroupChecklistResult } from "@/types/blog";
import type { BlogStudioDraft } from "@/lib/blog/studio-api";
import { CheckCircle2, Clock3, GitPullRequest, Loader2, Rocket, XCircle } from "lucide-react";

interface BlogStatusPanelProps {
  draft: BlogStudioDraft | null;
  checklist: BlogGroupChecklistResult | null;
  isPublishing: boolean;
  onPublish: () => void;
}

const statusToneMap: Record<
  BlogStudioDraft["workflowStatus"],
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "border-border text-foreground",
  },
  ready_for_review: {
    label: "Ready for review",
    className: "border-primary/20 bg-primary/10 text-primary",
  },
  pr_open: {
    label: "PR open",
    className: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  },
  merged: {
    label: "Merged",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
  published: {
    label: "Published",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
  failed: {
    label: "Failed",
    className: "border-destructive/20 bg-destructive/10 text-destructive",
  },
};

export default function BlogStatusPanel({
  draft,
  checklist,
  isPublishing,
  onPublish,
}: BlogStatusPanelProps) {
  if (!draft) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Select or create a draft to see readiness, workflow status, and publish actions.
        </CardContent>
      </Card>
    );
  }

  const statusTone = statusToneMap[draft.workflowStatus];
  const passedLanguageCount = checklist
    ? Object.values(checklist.languages).filter((entry) => entry.passed).length
    : 0;
  const totalLanguageCount = checklist?.requiredLanguages.length || 0;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="space-y-3">
        <CardTitle className="text-base">Workflow status</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={statusTone.className}>
            <Clock3 className="mr-1 h-3.5 w-3.5" />
            {statusTone.label}
          </Badge>

          <Badge variant="outline">
            <GitPullRequest className="mr-1 h-3.5 w-3.5" />
            Server-side publish flow
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-xl border border-border p-4">
          <div className="mb-3 text-sm font-semibold text-foreground">Readiness summary</div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Languages passing checklist</span>
              <span className="font-medium text-foreground">
                {passedLanguageCount} / {totalLanguageCount}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Global checklist</span>
              <span className="font-medium text-foreground">
                {checklist?.global.passed ? "Passed" : "Blocked"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Group ID</span>
              <span className="truncate font-medium text-foreground">{draft.groupId}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-border p-4">
          <div className="text-sm font-semibold text-foreground">Checklist gate</div>

          {checklist ? (
            <div className="space-y-2 text-sm">
              {checklist.passed ? (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  All required language and global checks are passing.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-4 w-4" />
                    Publish is blocked until every required language passes validation.
                  </div>

                  {checklist.global.missingKeys.length > 0 ? (
                    <div className="text-xs text-muted-foreground">
                      Global blockers: {checklist.global.missingKeys.join(", ")}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {checklist.requiredLanguages.map((lang) => {
                      const passed = checklist.languages[lang]?.passed;
                      return (
                        <Badge
                          key={lang}
                          variant="outline"
                          className={
                            passed
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                              : "border-destructive/20 bg-destructive/10 text-destructive"
                          }
                        >
                          {passed ? "✓" : "✕"} {lang.toUpperCase()}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No checklist available yet.</div>
          )}
        </div>

        <Button className="w-full" disabled={!checklist?.passed || isPublishing} onClick={onPublish}>
          {isPublishing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Rocket className="mr-2 h-4 w-4" />
              Submit for publish
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
