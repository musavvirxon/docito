import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BLOG_LANGUAGES } from "@/config/blog";
import type { BlogStudioDraft } from "@/lib/blog/studio-api";
import type { BlogLanguage } from "@/types/blog";
import { Copy, FileJson, Languages, ScanText, Sparkles, Trash2 } from "lucide-react";

interface BlogEditorShellProps {
  draft: BlogStudioDraft | null;
  onChangeLanguage: (lang: BlogLanguage, mode?: "active" | "preview") => void;
  onChangeGroupId: (value: string) => void;
  onChangeTitle: (value: string) => void;
  onChangeExcerpt: (value: string) => void;
  onChangeCoverImage: (value: string) => void;
  onChangeTags: (value: string) => void;
  onChangeFeatured: (value: boolean) => void;
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
  onChangeCoverImage,
  onChangeTags,
  onChangeFeatured,
  onDuplicate,
  onAutofillSeo,
  onOpenJson,
  onOpenDelete,
}: BlogEditorShellProps) {
  if (!draft) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ScanText className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Choose or create a blog draft</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a group from the left panel or create a new draft. This shell already manages shared
          fields, default-language metadata, JSON export, and preview wiring. The full multilingual
          editor lands in the next batch without changing this dashboard shell again.
        </p>
      </div>
    );
  }

  const active = draft.translations[draft.activeLanguage];

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-xl">Draft editor shell</CardTitle>
              <p className="text-sm text-muted-foreground">
                Shared fields and default-language content are editable now. Language-specific tabs,
                rich content, SEO panels, and the checklist matrix plug into this shell next.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={onDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
              <Button variant="outline" size="sm" onClick={onAutofillSeo}>
                <Sparkles className="mr-2 h-4 w-4" />
                Autofill SEO
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

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
              Active: {draft.activeLanguage.toUpperCase()}
            </Badge>
            <Badge variant="outline">Preview: {draft.previewLanguage.toUpperCase()}</Badge>
            <Badge variant="outline">Workflow: {draft.workflowStatus}</Badge>
            <Badge variant="outline">{draft.groupId}</Badge>
          </div>

          <Tabs value={draft.activeLanguage} onValueChange={(value) => onChangeLanguage(value as BlogLanguage)}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
              {BLOG_LANGUAGES.map((lang) => (
                <TabsTrigger
                  key={lang}
                  value={lang}
                  className="rounded-lg border border-border bg-background data-[state=active]:border-primary data-[state=active]:bg-primary/5"
                >
                  {lang.toUpperCase()}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4 rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Languages className="h-4 w-4 text-primary" />
                Shared post fields
              </div>

              <div className="space-y-2">
                <Label htmlFor="blog-group-id">Group ID</Label>
                <Input
                  id="blog-group-id"
                  value={draft.groupId}
                  onChange={(event) => onChangeGroupId(event.target.value)}
                  placeholder="group-id"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="blog-cover-image">Cover image</Label>
                <Input
                  id="blog-cover-image"
                  value={active.coverImage}
                  onChange={(event) => onChangeCoverImage(event.target.value)}
                  placeholder="/blog/group-id/cover.webp"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="blog-tags">Tags</Label>
                <Input
                  id="blog-tags"
                  value={active.tags.join(", ")}
                  onChange={(event) => onChangeTags(event.target.value)}
                  placeholder="doctor, clinic, medical platform"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Featured post</div>
                  <div className="text-xs text-muted-foreground">
                    Toggle whether this group should appear in featured areas.
                  </div>
                </div>
                <Switch checked={active.featured} onCheckedChange={onChangeFeatured} />
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-border p-4">
              <div className="text-sm font-semibold text-foreground">
                Default-language content ({draft.activeLanguage.toUpperCase()})
              </div>

              <div className="space-y-2">
                <Label htmlFor="blog-title">Title</Label>
                <Input
                  id="blog-title"
                  value={active.title}
                  onChange={(event) => onChangeTitle(event.target.value)}
                  placeholder="Blog post title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="blog-excerpt">Excerpt</Label>
                <Textarea
                  id="blog-excerpt"
                  value={active.excerpt}
                  onChange={(event) => onChangeExcerpt(event.target.value)}
                  placeholder="Short article summary"
                  className="min-h-[168px]"
                />
              </div>

              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Rich content blocks, per-language SEO fields, alt text, embeds, and validation gates
                are intentionally staged for the next batch so this shell stays stable and the admin
                route does not need to change again.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
