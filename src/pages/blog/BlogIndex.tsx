import BlogCard from "@/components/blog/BlogCard";
import BlogEmptyState from "@/components/blog/BlogEmptyState";
import { SEOHead } from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { getFeaturedBlogPosts, getPublishedBlogPosts } from "@/lib/blog/public-loader";
import { BookOpenText, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import type { BlogLanguage } from "@/types/blog";

export default function BlogIndex() {
  const { lang } = useParams<{ lang: string }>();
  const currentLang = (lang || "en") as BlogLanguage;

  const posts = useMemo(() => getPublishedBlogPosts(currentLang), [currentLang]);
  const featuredPosts = useMemo(
    () => getFeaturedBlogPosts(currentLang, 3),
    [currentLang],
  );
  const latestPosts = useMemo(
    () => posts.filter((post) => !featuredPosts.some((featured) => featured.groupId === post.groupId)),
    [featuredPosts, posts],
  );

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Docito Blog",
    inLanguage: currentLang,
    description:
      "Insights on healthcare automation, clinic management, patient records, and medical platform operations.",
    url: typeof window !== "undefined" ? window.location.href : "",
    blogPost: posts.slice(0, 12).map((post) => ({
      "@type": "BlogPosting",
      headline: post.seo.metaTitle || post.title,
      description: post.seo.metaDescription || post.excerpt,
      url: typeof window !== "undefined" ? `${window.location.origin}/${post.lang}/blog/${post.slug}` : "",
      datePublished: post.publishedAt || post.updatedAt || post.createdAt,
      image: post.seo.ogImage || post.coverImage || undefined,
      keywords: post.seo.keywords.length ? post.seo.keywords.join(", ") : post.tags.join(", "),
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Docito Blog | Healthcare automation, clinic operations, and medical platform insights"
        description="Explore Docito articles on doctor workflows, clinic automation, patient record systems, medical management software, and healthcare operations."
        keywords="Docito blog, healthcare blog, doctor software, clinic automation, patient record system, medical management software, healthcare operations"
        type="website"
        structuredData={structuredData}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 pb-16 pt-24 sm:px-6 lg:px-8 lg:pt-28">
        <section className="overflow-hidden rounded-[32px] border border-border bg-card shadow-sm">
          <div className="grid gap-8 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-12">
            <div className="space-y-5">
              <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
                <BookOpenText className="mr-1.5 h-3.5 w-3.5" />
                Docito Blog
              </Badge>

              <div className="space-y-3">
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  Healthcare automation insights for clinics, doctors, and modern medical teams
                </h1>
                <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Articles on patient records, clinic workflows, doctor operations, practice growth,
                  and the systems behind a scalable medical platform.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-3xl border border-border bg-background p-5">
                <div className="text-sm font-semibold text-foreground">Published articles</div>
                <div className="mt-2 text-3xl font-semibold text-foreground">{posts.length}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Static, language-aware blog pages backed by repo content files.
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-background p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Featured coverage
                </div>
                <div className="mt-2 text-3xl font-semibold text-foreground">
                  {featuredPosts.length}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Highlighted posts surface key topics first across the public blog.
                </div>
              </div>
            </div>
          </div>
        </section>

        {posts.length === 0 ? (
          <BlogEmptyState
            title="No published blog posts yet"
            description="Publish the first multilingual article from Blog Studio to make it appear here."
            actionHref={`/${currentLang}`}
            actionLabel="Back to home"
          />
        ) : (
          <>
            {featuredPosts.length > 0 ? (
              <section className="space-y-6">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Featured posts
                  </Badge>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {featuredPosts.map((post, index) => (
                    <BlogCard
                      key={`${post.groupId}-${post.lang}`}
                      post={post}
                      featuredVariant={index === 0}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Latest articles
                </h2>
                <p className="text-sm text-muted-foreground">
                  Clean, SEO-friendly static articles grouped by language and linked by post group.
                </p>
              </div>

              {latestPosts.length === 0 ? (
                <BlogEmptyState
                  title="No more posts outside featured yet"
                  description="Featured posts are live. Publish more articles to expand the full blog index."
                />
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {latestPosts.map((post) => (
                    <BlogCard key={`${post.groupId}-${post.lang}`} post={post} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
