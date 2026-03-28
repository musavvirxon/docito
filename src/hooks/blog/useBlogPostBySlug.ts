import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BlogLanguage, BlogPostRecord } from "@/types/blog";

const mapRow = (row: Record<string, unknown>): BlogPostRecord => ({
  groupId: row.group_id as string,
  lang: row.lang as BlogLanguage,
  slug: row.slug as string,
  status: (row.status as string) === "published" ? "published" : "draft",
  featured: row.featured as boolean,
  coverImage: (row.cover_image as string) || "",
  tags: (row.tags as string[]) || [],
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
  publishedAt: (row.published_at as string) || null,
  title: row.title as string,
  excerpt: (row.excerpt as string) || "",
  seo: {
    metaTitle: (row.meta_title as string) || "",
    metaDescription: (row.meta_description as string) || "",
    keywords: (row.keywords as string[]) || [],
    ogImage: (row.og_image as string) || "",
  },
  doc: (row.body as BlogPostRecord["doc"]) || { type: "doc", content: [] },
});

export function useBlogPostBySlug(lang: BlogLanguage, slug: string) {
  return useQuery({
    queryKey: ["blog-post", lang, slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("status", "published")
        .eq("lang", lang)
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return mapRow(data);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!lang && !!slug,
  });
}

export function useBlogPostTranslations(groupId: string | undefined) {
  return useQuery({
    queryKey: ["blog-post-translations", groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from("blog_posts")
        .select("lang, slug, title")
        .eq("group_id", groupId)
        .eq("status", "published");

      if (error) throw error;
      return (data || []).map((r) => ({
        lang: r.lang as BlogLanguage,
        slug: r.slug,
        title: r.title,
        href: `/${r.lang}/blog/${r.slug}`,
      }));
    },
    enabled: !!groupId,
    staleTime: 1000 * 60 * 5,
  });
}
