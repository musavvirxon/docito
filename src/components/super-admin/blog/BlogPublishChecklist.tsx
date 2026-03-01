import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BlogStudioDraft } from "@/lib/blog/studio-api";
import type { BlogGroupChecklistResult, BlogLanguage } from "@/types/blog";
import {
  CheckCircle2,
  Globe2,
  Sparkles,
  XCircle,
} from "lucide-react";

interface BlogPublishChecklistProps {
  draft: BlogStudioDraft | null;
  checklist: BlogGroupChecklistResult | null;
  onAutofillAll: () => void;
  onAutofillLanguage: (lang: BlogLanguage) => void;
}

const renderPassedIcon = (passed: boolean) =>
  passed ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
  ) : (
    <XCircle className="h-4 w-4 text-destructive" />
  );

export default function BlogPublishChecklist({
  draft,
  checklist,
  onAutofillAll,
  onAutofillLanguage,
}: BlogPublishChecklistProps) {
  if (!draft || !checklist) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Publish checklist</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Open a draft to inspect per-language and global publish readiness.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="text-base">Publish checklist</CardTitle>
          <Button size="sm" variant="outline" onClick={onAutofillAll}>
            <Sparkles className="mr-2 h-4 w-4" />
            Autofill all languages
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className={
              checklist.passed
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                : "border-destructive/20 bg-destructive/10 text-destructive"
            }
          >
            {checklist.passed ? "Ready to submit" : "Blocked"}
          </Badge>

          <Badge variant="outline">
            {checklist.publishableLanguages.length} / {checklist.requiredLanguages.length} languages passing
          </Badge>

          <Badge variant="outline">
            <Globe2 className="mr-1 h-3.5 w-3.5" />
            One file per language
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-3 rounded-xl border border-border p-4">
          <div className="text-sm font-semibold text-foreground">Global checks</div>
          <div className="space-y-2">
            {checklist.global.items.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 text-foreground">
                  {renderPassedIcon(item.passed)}
                  <span>{item.label}</span>
                </div>
                <Badge variant="outline">{item.passed ? "Passed" : "Missing"}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {checklist.requiredLanguages.map((lang) => {
            const languageChecklist = checklist.languages[lang];
            const translation = draft.translations[lang];

            return (
              <div
                key={lang}
                className="space-y-3 rounded-xl border border-border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      {renderPassedIcon(languageChecklist.passed)}
                      <span>{lang.toUpperCase()}</span>
                      <Badge variant="outline">
                        {languageChecklist.passed ? "Ready" : "Blocked"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {translation.title?.trim()
                        ? translation.title
                        : "No title yet"}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onAutofillLanguage(lang)}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Autofill
                  </Button>
                </div>

                <div className="grid gap-2">
                  {languageChecklist.items.map((item) => (
                    <div
                      key={`${lang}-${item.key}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2 text-foreground">
                        {renderPassedIcon(item.passed)}
                        <span>{item.label}</span>
                      </div>
                      <Badge variant="outline">{item.passed ? "Passed" : "Missing"}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
