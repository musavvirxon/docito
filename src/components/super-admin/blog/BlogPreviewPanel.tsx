import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReturnTypeOfUseBlogPreview } from "./blogPreviewTypes";
import { Clock3, ExternalLink, ImageIcon, Languages } from "lucide-react";

type PreviewHookValue = {
  previewLanguage: string;
  preview: {
    post: {
      title: string;
      excerpt: string;
      slug: string;
      coverImage: string;
      seo: {
        metaTitle: string;
        metaDescription: string;
        keywords: string[];
        ogImage: string;
      };
    };
    translations: Array<{
      lang: string;
      href: string;
      title: string;
      slug: string;
    }>;
  } | null;
  readingMinutes: number;
};

interface BlogPreviewPanelProps {
  previewState: PreviewHookValue;
}

export default function BlogPreviewPanel({ previewState }: BlogPreviewPanelProps) {
  const { preview, previewLanguage, readingMinutes } = previewState;

  if (!preview) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Open a draft to see the article preview, translation alternates, and resolved SEO summary.
        </CardContent>
      </Card>
    );
  }

  const { post, translations } = preview;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="space-y-3">
        <CardTitle className="text-base">Preview snapshot</CardTitle>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
            {previewLanguage.toUpperCase()}
          </Badge>
          <Badge variant="outline">
            <Clock3 className="mr-1 h-3.5 w-3.5" />
            {readingMinutes} min read
          </Badge>
          <Badge variant="outline">
            <Languages className="mr-1 h-3.5 w-3.5" />
            {translations.length} alternates
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {post.coverImage ? (
          <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
            <img
              src={post.coverImage}
              alt={post.title || "Blog cover"}
              className="h-44 w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
            <ImageIcon className="mr-2 h-4 w-4" />
            No cover image yet
          </div>
        )}

        <div className="space-y-2">
          <div className="text-lg font-semibold text-foreground">{post.title || "Untitled post"}</div>
          <div className="text-sm text-muted-foreground">
            {post.excerpt || "Add an excerpt to improve list views, previews, and metadata."}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border p-4">
          <div className="text-sm font-semibold text-foreground">SEO snapshot</div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Meta title:</span>{" "}
              {post.seo.metaTitle || "Missing"}
            </div>
            <div>
              <span className="font-medium text-foreground">Meta description:</span>{" "}
              {post.seo.metaDescription || "Missing"}
            </div>
            <div>
              <span className="font-medium text-foreground">Slug:</span> /blog/{post.slug || "missing-slug"}
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border p-4">
          <div className="text-sm font-semibold text-foreground">Translation alternates</div>
          <div className="space-y-2">
            {translations.map((translation) => (
              <div
                key={`${translation.lang}-${translation.slug}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-foreground">{translation.lang.toUpperCase()}</div>
                  <div className="truncate text-muted-foreground">
                    {translation.title || translation.slug}
                  </div>
                </div>
                <a
                  href={translation.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-shrink-0 items-center gap-1 text-primary hover:underline"
                >
                  Open
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
