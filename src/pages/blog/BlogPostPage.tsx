import { Link, useParams } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays, Loader2, Tag } from "lucide-react";
import type { BlogLanguage, BlogDocNode } from "@/types/blog";
import { useBlogPostBySlug, useBlogPostTranslations } from "@/hooks/blog/useBlogPostBySlug";
import { BLOG_LANGUAGES } from "@/config/blog";

const getSiteUrl = () => {
  const env =
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> })?.env?.VITE_SITE_URL ||
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> })?.env?.VITE_APP_URL;
  return typeof env === "string" && env.trim() ? env.replace(/\/+$/, "") : "https://www.docito.app";
};

function renderNode(node: BlogDocNode, idx: number): React.ReactNode {
  if (node.type === "text") {
    let el: React.ReactNode = node.text || "";
    for (const mark of node.marks || []) {
      if (mark.type === "bold") el = <strong key={idx}>{el}</strong>;
      else if (mark.type === "italic") el = <em key={idx}>{el}</em>;
      else if (mark.type === "underline") el = <u key={idx}>{el}</u>;
      else if (mark.type === "link") el = <a key={idx} href={String(mark.attrs?.href || "#")} className="text-primary underline" target="_blank" rel="noopener noreferrer">{el}</a>;
    }
    return el;
  }

  const children = (node.content || []).map((child, i) => renderNode(child, i));

  switch (node.type) {
    case "paragraph": return <p key={idx} className="mb-4 leading-7 text-foreground">{children}</p>;
    case "heading": {
      const level = (node.attrs?.level as number) || 2;
      const cls = `mb-3 mt-8 font-semibold text-foreground ${level <= 2 ? "text-2xl" : "text-xl"}`;
      if (level === 1) return <h1 key={idx} className={cls}>{children}</h1>;
      if (level === 3) return <h3 key={idx} className={cls}>{children}</h3>;
      if (level === 4) return <h4 key={idx} className={cls}>{children}</h4>;
      if (level === 5) return <h5 key={idx} className={cls}>{children}</h5>;
      if (level === 6) return <h6 key={idx} className={cls}>{children}</h6>;
      return <h2 key={idx} className={cls}>{children}</h2>;
    }
    case "bulletList": return <ul key={idx} className="mb-4 list-disc pl-6 space-y-1">{children}</ul>;
    case "orderedList": return <ol key={idx} className="mb-4 list-decimal pl-6 space-y-1">{children}</ol>;
    case "listItem": return <li key={idx}>{children}</li>;
    case "blockquote": return <blockquote key={idx} className="mb-4 border-l-4 border-primary/30 pl-4 italic text-muted-foreground">{children}</blockquote>;
    case "codeBlock": return <pre key={idx} className="mb-4 overflow-x-auto rounded-lg bg-muted p-4 text-sm"><code>{children}</code></pre>;
    case "horizontalRule": return <hr key={idx} className="my-8 border-border" />;
    case "image": return <img key={idx} src={String(node.attrs?.src || "")} alt={String(node.attrs?.alt || "")} className="my-6 rounded-xl max-w-full" />;
    default: return <div key={idx}>{children}</div>;
  }
}

export default function BlogPostPage() {
  const { lang = "en", slug = "post" } = useParams<{ lang: string; slug: string }>();
  const currentLang = lang as BlogLanguage;
  const siteUrl = getSiteUrl();

  const { data: post, isLoading, error } = useBlogPostBySlug(currentLang, slug);
  const { data: translations = [] } = useBlogPostTranslations(post?.groupId);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!post || error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <h1 className="text-3xl font-bold text-foreground">Article not found</h1>
        <p className="text-muted-foreground">This blog post doesn't exist or hasn't been published yet.</p>
        <Button variant="outline" asChild>
          <Link to={`/${lang}/blog`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to blog
          </Link>
        </Button>
      </div>
    );
  }

  const canonicalUrl = `${siteUrl}/${post.lang}/blog/${post.slug}`;
  const alternateLanguages = translations.map((t) => ({ lang: t.lang, href: `${siteUrl}/${t.lang}/blog/${t.slug}` }));
  const publishDate = post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.seo.metaTitle || post.title,
    description: post.seo.metaDescription || post.excerpt,
    inLanguage: post.lang,
    mainEntityOfPage: canonicalUrl,
    image: post.seo.ogImage || post.coverImage ? [post.seo.ogImage || post.coverImage] : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Organization", name: "Docito" },
    publisher: { "@type": "Organization", name: "Docito" },
    keywords: post.seo.keywords.length ? post.seo.keywords.join(", ") : post.tags.join(", "),
  };

  return (
    <>
      <SEOHead
        title={`${post.seo.metaTitle || post.title} | Docito Blog`}
        description={post.seo.metaDescription || post.excerpt}
        keywords={post.seo.keywords.length ? post.seo.keywords : post.tags}
        image={post.seo.ogImage || post.coverImage}
        type="article"
        canonicalUrl={canonicalUrl}
        alternateLanguages={alternateLanguages}
        structuredData={structuredData}
      />

      <article className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12 md:px-6 md:py-16">
        {/* Back link */}
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link to={`/${lang}/blog`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to blog
          </Link>
        </Button>

        {/* Cover image */}
        {post.coverImage && (
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full rounded-2xl object-cover max-h-[420px]"
          />
        )}

        {/* Header */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {publishDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {publishDate}
              </span>
            )}
            <Badge variant="outline">{post.lang.toUpperCase()}</Badge>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>
          )}

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="font-normal">
                  <Tag className="mr-1 h-3 w-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </header>

        {/* Language alternates */}
        {translations.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
            <span className="text-muted-foreground">Also available in:</span>
            {translations
              .filter((t) => t.lang !== post.lang)
              .map((t) => (
                <Link
                  key={t.lang}
                  to={`/${t.lang}/blog/${t.slug}`}
                  className="rounded-md bg-background px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  {t.lang.toUpperCase()}
                </Link>
              ))}
          </div>
        )}

        {/* Body */}
        <div className="prose-docito">
          {post.doc.content.map((node, i) => renderNode(node, i))}
        </div>
      </article>
    </>
  );
}
