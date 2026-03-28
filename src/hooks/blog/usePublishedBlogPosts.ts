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

export function usePublishedBlogPosts(lang?: BlogLanguage) {
  return useQuery({
    queryKey: ["published-blog-posts", lang ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("blog_posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (lang) {
        query = query.eq("lang", lang);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapRow);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useFeaturedBlogPosts(lang: BlogLanguage, limit = 3) {
  return useQuery({
    queryKey: ["featured-blog-posts", lang, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("status", "published")
        .eq("lang", lang)
        .eq("featured", true)
        .order("published_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []).map(mapRow);
    },
    staleTime: 1000 * 60 * 5,
  });
}
