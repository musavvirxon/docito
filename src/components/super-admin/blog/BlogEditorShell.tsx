import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BlogStudioDraft } from "@/lib/blog/studio-api";
import type { BlogLanguage, BlogPostStatus } from "@/types/blog";
import { Copy, FileJson, Sparkles, Trash2 } from "lucide-react";
import BlogLanguageTabs from "@/components/super-admin/blog/BlogLanguageTabs";
import BlogMetaPanel from "@/components/super-admin/blog/BlogMetaPanel";
import BlogSharedFieldsPanel from "@/components/super-admin/blog/BlogSharedFieldsPanel";
import BlogTranslationEditor from "@/components/super-admin/blog/BlogTranslationEditor";

interface BlogEditorShellProps {
  draft: BlogStudioDraft | null;
  onChangeLanguage: (lang: BlogLanguage, mode?: "active" | "preview") => void;
  onChangeGroupId: (value: string) => void;
  onChangeTitle: (value: string) => void;
  onChangeExcerpt: (value: string) => void;
  onChangeSlug: (value: string) => void;
  onChangeStatus: (value: BlogPostStatus) => void;
  onChangeCoverImage: (value: string) => void;
  onChangeTags: (value: string) => void;
  onChangeFeatured: (value: boolean) => void;
  onChangeMetaTitle: (value: string) => void;
  onChangeMetaDescription: (value: string) => void;
  onChangeKeywords: (value: string) => void;
  onChangeOgImage: (value: string) => void;
  onAutofillCurrentLanguageSeo: () => void;
  onDuplicate: () => void;
  onAutofillSeo: () => void;
  onOpenJson: () => void;
  onOpenDelete: () => void;
}

export default function BlogEditorShell({
  draft,
  onChangeLanguage,
  onChangeGroupId,
  onChangeTitle,
  onChangeExcerpt,
  onChangeSlug,
  onChangeStatus,
  onChangeCoverImage,
  onChangeTags,
  onChangeFeatured,
  onChangeMetaTitle,
  onChangeMetaDescription,
  onChangeKeywords,
  onChangeOgImage,
  onAutofillCurrentLanguageSeo,
  onDuplicate,
  onAutofillSeo,
  onOpenJson,
  onOpenDelete,
}: BlogEditorShellProps) {
  if (!draft) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FileJson className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Choose or create a blog draft</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a group from the left panel or create a new draft. This multilingual shell now
          separates group-wide fields from per-language content and SEO, so the next rich-editor
          batch can plug in without changing the dashboard structure.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-xl">Multilingual editor shell</CardTitle>
              <p className="text-sm text-muted-foreground">
                Shared fields, per-language content, and per-language SEO are separated below.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={onDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
              <Button variant="outline" size="sm" onClick={onAutofillSeo}>
                <Sparkles className="mr-2 h-4 w-4" />
                Autofill all SEO
              </Button>
              <Button variant="outline" size="sm" onClick={onOpenJson}>
                <FileJson className="mr-2 h-4 w-4" />
                JSON export
              </Button>
              <Button variant="outline" size="sm" onClick={onOpenDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <BlogLanguageTabs draft={draft} onChangeLanguage={onChangeLanguage} />

          <div className="grid gap-6 xl:grid-cols-2">
            <BlogSharedFieldsPanel
              draft={draft}
              onChangeGroupId={onChangeGroupId}
              onChangeCoverImage={onChangeCoverImage}
              onChangeTags={onChangeTags}
              onChangeFeatured={onChangeFeatured}
            />

            <BlogMetaPanel
              draft={draft}
              onChangeMetaTitle={onChangeMetaTitle}
              onChangeMetaDescription={onChangeMetaDescription}
              onChangeKeywords={onChangeKeywords}
              onChangeOgImage={onChangeOgImage}
              onAutofillLanguageSeo={onAutofillCurrentLanguageSeo}
            />
          </div>

          <BlogTranslationEditor
            draft={draft}
            onChangeLanguage={onChangeLanguage}
            onChangeTitle={onChangeTitle}
            onChangeExcerpt={onChangeExcerpt}
            onChangeSlug={onChangeSlug}
            onChangeStatus={onChangeStatus}
          />
        </CardContent>
      </Card>
    </div>
  );
}
