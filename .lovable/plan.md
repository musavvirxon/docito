

# Plan: Dynamic Blog Publishing with SEO Crawlability

## Current Problems

1. **Blog posts don't appear publicly** -- Admin publishes to the `blog_posts` Supabase table, but the public blog reads from static JSON files (`import.meta.glob`). Nothing connects them.
2. **No blog URLs in sitemap** -- `sitemap.xml` has zero blog entries. Search engines don't know your blog pages exist.
3. **Content invisible to crawlers** -- This is a JavaScript SPA. When Google/Bing crawl a blog URL, they get an empty `<div id="root"></div>`. The `react-helmet-async` meta tags only render after JS executes. While Googlebot can execute JS, it's slower to index and many crawlers (Bing, social media previews, AI search) cannot.
4. **Build error** -- Likely TypeScript mismatches from recent blog-studio refactor.

## Plan

### Step 1: Connect public blog pages to Supabase

Replace the static file loader with live database queries.

- Create `src/hooks/blog/usePublishedBlogPosts.ts` -- queries `blog_posts` table where `status = 'published'`, ordered by `published_at DESC`
- Create `src/hooks/blog/useBlogPostBySlug.ts` -- single post lookup by lang + slug
- Update `BlogIndex.tsx` to use the Supabase hook instead of `getPublishedBlogPosts()`
- Update `BlogPost.tsx` to use the Supabase hook instead of `getBlogPostBySlug()`
- Keep all existing SEO components (`SEOHead`, structured data, hreflang) -- they just need real data

### Step 2: Create a dynamic blog sitemap edge function

Blog URLs are dynamic, so the static `sitemap.xml` cannot include them.

- Create `supabase/functions/blog-sitemap/index.ts` -- queries published posts, returns valid XML sitemap with `<loc>`, `<lastmod>`, and `<xhtml:link>` alternates per language
- Add rewrite in `public/_redirects`: `/blog-sitemap.xml` routes to the edge function
- Add `blog-sitemap.xml` reference to `public/sitemap-index.xml`
- Add blog sitemap URL to `public/robots.txt`

### Step 3: Create a blog prerender edge function (makes content crawlable)

This is the critical step for search engine discoverability. Create an edge function that serves server-rendered HTML for blog URLs when visited by crawlers.

- Create `supabase/functions/blog-ssr/index.ts`:
  - Detects crawler user-agents (Googlebot, Bingbot, Twitterbot, facebookexternalhit, LinkedInBot, etc.)
  - For crawlers: fetches the blog post from `blog_posts` table, renders a complete HTML page with all meta tags, structured data, Open Graph tags, and the full article text in semantic HTML
  - For regular users: returns a redirect to the SPA (normal React app)
- Add rewrite rules in `public/_redirects` for blog paths (`/:lang/blog/*`) pointing to the edge function
- This ensures Google, Bing, social media link previews, and AI search engines can all read your blog content and recommend it in search results

### Step 4: Fix build error

Audit and fix TypeScript type mismatches in `BlogStudioSection.tsx` and `BlogPublishActions.tsx` from the recent `studio-api.ts` refactor.

## Technical Details

**Blog SSR edge function** will serve HTML like:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>My Blog Post | Docito Blog</title>
  <meta name="description" content="..." />
  <meta property="og:title" content="..." />
  <link rel="canonical" href="https://docito.live/en/blog/my-post" />
  <script type="application/ld+json">{"@type":"Article",...}</script>
</head>
<body>
  <article><h1>My Blog Post</h1><p>Full content here...</p></article>
</body>
</html>
```

**Blog sitemap output:**
```xml
<url>
  <loc>https://docito.live/en/blog/my-post-slug</loc>
  <lastmod>2026-03-25</lastmod>
  <xhtml:link rel="alternate" hreflang="de" href="https://docito.live/de/blog/..." />
</url>
```

**Files to create:**
- `src/hooks/blog/usePublishedBlogPosts.ts`
- `src/hooks/blog/useBlogPostBySlug.ts`
- `supabase/functions/blog-sitemap/index.ts`
- `supabase/functions/blog-ssr/index.ts`

**Files to modify:**
- `src/pages/blog/BlogIndex.tsx` -- use Supabase hook
- `src/pages/blog/BlogPost.tsx` -- use Supabase hook
- `public/sitemap-index.xml` -- add blog sitemap reference
- `public/robots.txt` -- add blog sitemap URL
- `public/_redirects` -- add blog-sitemap + blog-ssr rewrites
- `src/components/super-admin/blog/BlogStudioSection.tsx` -- fix types
- `src/components/super-admin/blog/BlogPublishActions.tsx` -- fix types

