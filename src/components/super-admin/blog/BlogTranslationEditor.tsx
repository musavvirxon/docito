import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { BlogStudioDraft } from "@/lib/blog/studio-api";
import type { BlogLanguage, BlogPostStatus } from "@/types/blog";
import { CalendarClock, FileText, Languages, Link2, Type } from "lucide-react";

interface BlogTranslationEditorProps {
  draft: BlogStudioDraft;
  onChangeLanguage: (lang: BlogLanguage, mode?: "active" | "preview") => void;
  onChangeTitle: (value: string) => void;
  onChangeExcerpt: (value: string) => void;
  onChangeSlug: (value: string) => void;
  onChangeStatus: (value: BlogPostStatus) => void;
}

export default function BlogTranslationEditor({
  draft,
  onChangeLanguage,
  onChangeTitle,
  onChangeExcerpt,
  onChangeSlug,
  onChangeStatus,
}: BlogTranslationEditorProps) {
  const active = draft.translations[draft.activeLanguage];

  return (
    <div className="space-y-4 rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-foreground">
            Translation content ({draft.activeLanguage.toUpperCase()})
          </div>
          <p className="text-xs text-muted-foreground">
            These fields are unique to the selected language file.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
            <Languages className="mr-1 h-3.5 w-3.5" />
            {draft.activeLanguage.toUpperCase()}
          </Badge>
          <Badge variant="outline">
            Updated {new Date(active.updatedAt).toLocaleString()}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
        <div className="space-y-2">
          <Label htmlFor="blog-title" className="flex items-center gap-2">
            <Type className="h-4 w-4 text-primary" />
            Title
          </Label>
          <Input
            id="blog-title"
            value={active.title}
            onChange={(event) => onChangeTitle(event.target.value)}
            placeholder="Blog post title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="blog-status">Status</Label>
          <Select
            value={active.status}
            onValueChange={(value) => onChangeStatus(value as BlogPostStatus)}
          >
            <SelectTrigger id="blog-status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">draft</SelectItem>
              <SelectItem value="published">published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="blog-slug" className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          Slug
        </Label>
        <Input
          id="blog-slug"
          value={active.slug}
          onChange={(event) => onChangeSlug(event.target.value)}
          placeholder="blog-post-slug"
        />
        <p className="text-xs text-muted-foreground">Public URL: /{draft.activeLanguage}/blog/{active.slug || "slug"}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="blog-excerpt" className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Excerpt
        </Label>
        <Textarea
          id="blog-excerpt"
          value={active.excerpt}
          onChange={(event) => onChangeExcerpt(event.target.value)}
          placeholder="Short article summary"
          className="min-h-[150px]"
        />
      </div>

      <div className="rounded-xl border border-dashed border-border p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          <CalendarClock className="h-4 w-4 text-primary" />
          Translation timing
        </div>

        <div className="grid gap-3 text-xs text-muted-foreground md:grid-cols-3">
          <div>
            <div className="font-medium text-foreground">Created</div>
            <div>{new Date(active.createdAt).toLocaleString()}</div>
          </div>
          <div>
            <div className="font-medium text-foreground">Updated</div>
            <div>{new Date(active.updatedAt).toLocaleString()}</div>
          </div>
          <div>
            <div className="font-medium text-foreground">Published</div>
            <div>{active.publishedAt ? new Date(active.publishedAt).toLocaleString() : "Not published"}</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        Rich document editing for the article body, media embeds, captions, and inline formatting
        is intentionally coming in the next batch so the multilingual field model stays stable first.
      </div>

      <div className="flex flex-wrap gap-2">
        {draft.activeLanguage !== draft.previewLanguage ? (
          <Badge variant="outline">
            Preview currently uses {draft.previewLanguage.toUpperCase()}
          </Badge>
        ) : (
          <Badge variant="outline">Preview matches active language</Badge>
        )}

        <Badge
          variant="outline"
          className="cursor-pointer"
          onClick={() => onChangeLanguage(draft.activeLanguage, "preview")}
        >
          Use {draft.activeLanguage.toUpperCase()} for preview
        </Badge>
      </div>
    </div>
  );
}
