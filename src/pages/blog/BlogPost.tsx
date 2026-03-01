import BlogArticleRenderer from "@/components/blog/BlogArticleRenderer";
import BlogEmptyState from "@/components/blog/BlogEmptyState";
import RelatedBlogPosts from "@/components/blog/RelatedBlogPosts";
import { SEOHead } from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  buildBlogIndexPath,
  buildBlogPostPath,
  getBlogGroupTranslations,
  getBlogPostBySlug,
  getRelatedBlogPosts,
} from "@/lib/blog/public-loader";
import { CalendarDays, Languages, Sparkles, Tag } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import type { BlogDoc, BlogLanguage } from "@/types/blog";

const getSiteUrl = () => {
  const env =
    (import.meta as ImportMeta & {
      env?: Record<string, string | undefined>;
    })?.env?.VITE_SITE_URL ||
    (import.meta as ImportMeta & {
      env?: Record<string, string | undefined>;
    })?.env?.VITE_PUBLIC_SITE_URL ||
    (import.meta as ImportMeta & {
      env?: Record<string, string | undefined>;
    })?.env?.VITE_APP_URL;

  return typeof env === "string" && env.trim()
    ? env.replace(/\/+$/, "")
    : "https://www.docito.app";
};

const extractTextFromDoc = (doc: BlogDoc | null | undefined): string => {
  if (!doc || typeof doc !== "object") return "";

  const visit = (node: unknown): string => {
    if (!node || typeof node !== "object") return "";

    const typedNode = node as {
      text?: string;
      content?: unknown[];
    };

    const text = typeof typedNode.text === "string" ? typedNode.text : "";
    const children = Array.isArray(typedNode.content)
      ? typedNode.content.map((child) => visit(child)).join(" ")
      : "";

    return [text, children].filter(Boolean).join(" ").trim();
  };

  return visit(doc).replace(/\s+/g, " ").trim();
};

const estimateReadingMinutes = (doc: BlogDoc) => {
  const words = extractTextFromDoc(doc)
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 220));
};

export default function BlogPost() {
  const { lang, slug } = useParams<{ lang: string; slug: string }>();
  const currentLang = (lang || "en") as BlogLanguage;
  const currentSlug = slug || "";
  const siteUrl = getSiteUrl();

  const post = useMemo(
    () => getBlogPostBySlug(currentLang, currentSlug),
    [currentLang, currentSlug],
  );

  const relatedPosts = useMemo(
    () => (post ? getRelatedBlogPosts(post, 3) : []),
    [post],
  );

  const translations = useMemo(
    () => (post ? getBlogGroupTranslations(post.groupId) : {}),
    [post],
  );

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead
          title="Blog post not found | Docito"
          description="The requested article could not be found."
          noindex
        />

        <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-24 sm:px-6 lg:px-8 lg:pt-28">
          <BlogEmptyState
            title="Article not found"
            description="This blog article is not available in the selected language or has not been published yet."
            actionHref={`/${currentLang}/blog`}
            actionLabel="Go to blog"
          />
        </div>
      </div>
    );
  }

  const canonicalUrl = `${siteUrl}${buildBlogPostPath(post.lang, post.slug)}`;
  const translationEntries = Object.values(translations);
  const xDefaultTarget =
    translations.en ||
    translationEntries[0] ||
    post;

  const alternates = translationEntries.map((translation) => ({
    hrefLang: translation.lang,
    href: `${siteUrl}${buildBlogPostPath(translation.lang, translation.slug)}`,
  })).concat({
    hrefLang: "x-default",
    href: `${siteUrl}${buildBlogPostPath(xDefaultTarget.lang, xDefaultTarget.slug)}`,
  });

  const readingMinutes = estimateReadingMinutes(post.doc);
  const publishDate = new Date(
    post.publishedAt || post.updatedAt || post.createdAt,
  ).toLocaleDateString();

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.seo.metaTitle || post.title,
      description: post.seo.metaDescription || post.excerpt,
      image: post.seo.ogImage || post.coverImage || undefined,
      datePublished: post.publishedAt || post.updatedAt || post.createdAt,
      dateModified: post.updatedAt || post.createdAt,
      inLanguage: post.lang,
      keywords: post.seo.keywords.length
        ? post.seo.keywords.join(", ")
        : post.tags.join(", "),
      author: {
        "@type": "Organization",
        name: "Docito",
      },
      publisher: {
        "@type": "Organization",
        name: "Docito",
      },
      mainEntityOfPage: canonicalUrl,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Blog",
          item: `${siteUrl}${buildBlogIndexPath(post.lang)}`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: post.title,
          item: canonicalUrl,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={post.seo.metaTitle || `${post.title} | Docito Blog`}
        description={post.seo.metaDescription || post.excerpt}
        keywords={
          post.seo.keywords.length
            ? post.seo.keywords
            : post.tags
        }
        image={post.seo.ogImage || post.coverImage}
        type="article"
        canonicalUrl={canonicalUrl}
        alternates={alternates}
        publishedTime={post.publishedAt || post.updatedAt || post.createdAt}
        modifiedTime={post.updatedAt || post.createdAt}
        section="Blog"
        structuredData={structuredData}
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 pb-16 pt-24 sm:px-6 lg:px-8 lg:pt-28">
        <section className="space-y-8">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Link to={buildBlogIndexPath(currentLang)} className="text-primary hover:underline">
                Blog
              </Link>
              <span>/</span>
              <span className="truncate">{post.title}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
                {post.lang.toUpperCase()}
              </Badge>

              {post.featured ? (
                <Badge variant="outline">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Featured
                </Badge>
              ) : null}

              <Badge variant="outline">
                <CalendarDays className="mr-1 h-3.5 w-3.5" />
                {publishDate}
              </Badge>

              <Badge variant="outline">{readingMinutes} min read</Badge>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                {post.title}
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
                {post.excerpt}
              </p>
            </div>

            {post.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="font-normal">
                    <Tag className="mr-1 h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          {post.coverImage ? (
            <div className="overflow-hidden rounded-[32px] border border-border bg-card shadow-sm">
              <img
                src={post.coverImage}
                alt={post.title}
                className="h-auto max-h-[560px] w-full object-cover"
              />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <Badge variant="outline">
              <Languages className="mr-1 h-3.5 w-3.5" />
              Translations
            </Badge>

            {translationEntries.map((translation) => (
              <Link
                key={`${translation.lang}-${translation.slug}`}
                to={buildBlogPostPath(translation.lang, translation.slug)}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  translation.lang === post.lang
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground hover:bg-muted"
                }`}
              >
                {translation.lang.toUpperCase()}
              </Link>
            ))}
          </div>
        </section>

        <Separator />

        <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm sm:p-8">
          <BlogArticleRenderer doc={post.doc} />
        </section>

        <RelatedBlogPosts posts={relatedPosts} />

        <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Keep exploring the Docito Blog
            </h2>
            <p className="text-sm text-muted-foreground">
              Find more content on clinic workflows, patient records, doctor operations, and medical platform growth.
            </p>
            <Link
              to={buildBlogIndexPath(currentLang)}
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              Back to all blog posts →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
