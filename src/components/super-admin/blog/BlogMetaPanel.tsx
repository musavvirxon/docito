import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BlogStudioDraft } from "@/lib/blog/studio-api";
import { SearchCheck, Sparkles } from "lucide-react";

interface BlogMetaPanelProps {
  draft: BlogStudioDraft;
  onChangeMetaTitle: (value: string) => void;
  onChangeMetaDescription: (value: string) => void;
  onChangeKeywords: (value: string) => void;
  onChangeOgImage: (value: string) => void;
  onAutofillLanguageSeo: () => void;
}

export default function BlogMetaPanel({
  draft,
  onChangeMetaTitle,
  onChangeMetaDescription,
  onChangeKeywords,
  onChangeOgImage,
  onAutofillLanguageSeo,
}: BlogMetaPanelProps) {
  const active = draft.translations[draft.activeLanguage];

  return (
    <div className="space-y-4 rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <SearchCheck className="h-4 w-4 text-primary" />
            SEO metadata ({draft.activeLanguage.toUpperCase()})
          </div>
          <p className="text-xs text-muted-foreground">
            These fields are stored per language and power metadata, previews, and indexing.
          </p>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={onAutofillLanguageSeo}>
          <Sparkles className="mr-2 h-4 w-4" />
          Autofill this language
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="blog-meta-title">Meta title</Label>
        <Input
          id="blog-meta-title"
          value={active.seo.metaTitle}
          onChange={(event) => onChangeMetaTitle(event.target.value)}
          placeholder="Meta title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="blog-meta-description">Meta description</Label>
        <Textarea
          id="blog-meta-description"
          value={active.seo.metaDescription}
          onChange={(event) => onChangeMetaDescription(event.target.value)}
          placeholder="Meta description"
          className="min-h-[120px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="blog-keywords">Keywords</Label>
        <Input
          id="blog-keywords"
          value={active.seo.keywords.join(", ")}
          onChange={(event) => onChangeKeywords(event.target.value)}
          placeholder="doctor, clinic, patient record"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="blog-og-image">OG image</Label>
        <Input
          id="blog-og-image"
          value={active.seo.ogImage}
          onChange={(event) => onChangeOgImage(event.target.value)}
          placeholder="/blog/group-id/cover.webp"
        />
      </div>

      <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
        Autofill uses the current title, excerpt, cover image, and tags when matching SEO fields are empty.
      </div>
    </div>
  );
}
