import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BLOG_LANGUAGES } from "@/config/blog";
import type { BlogStudioDraft } from "@/lib/blog/studio-api";
import type { BlogLanguage } from "@/types/blog";
import { Eye, Languages, PencilLine } from "lucide-react";

interface BlogLanguageTabsProps {
  draft: BlogStudioDraft;
  onChangeLanguage: (lang: BlogLanguage, mode?: "active" | "preview") => void;
}

export default function BlogLanguageTabs({
  draft,
  onChangeLanguage,
}: BlogLanguageTabsProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Languages className="h-4 w-4 text-primary" />
            Multilingual editing
          </div>
          <p className="text-xs text-muted-foreground">
            Choose the editing language and the preview language independently.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
            Editing: {draft.activeLanguage.toUpperCase()}
          </Badge>
          <Badge variant="outline">Preview: {draft.previewLanguage.toUpperCase()}</Badge>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <PencilLine className="h-3.5 w-3.5" />
          Editing language
        </div>

        <Tabs
          value={draft.activeLanguage}
          onValueChange={(value) => onChangeLanguage(value as BlogLanguage, "active")}
        >
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            {BLOG_LANGUAGES.map((lang) => {
              const translation = draft.translations[lang];
              const hasContent = Boolean(
                translation?.title?.trim() ||
                  translation?.excerpt?.trim() ||
                  translation?.slug?.trim(),
              );

              return (
                <TabsTrigger
                  key={`active-${lang}`}
                  value={lang}
                  className="rounded-lg border border-border bg-background data-[state=active]:border-primary data-[state=active]:bg-primary/5"
                >
                  <span className="mr-1.5">{lang.toUpperCase()}</span>
                  <span
                    className={hasContent ? "text-emerald-600 dark:text-emerald-300" : "text-muted-foreground"}
                  >
                    {hasContent ? "●" : "○"}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          Preview language
        </div>

        <div className="flex flex-wrap gap-2">
          {BLOG_LANGUAGES.map((lang) => (
            <Button
              key={`preview-${lang}`}
              type="button"
              size="sm"
              variant={draft.previewLanguage === lang ? "default" : "outline"}
              onClick={() => onChangeLanguage(lang, "preview")}
            >
              {lang.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
