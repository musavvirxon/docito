import {
  BLOG_DEFAULT_AUTHOR_NAME,
  BLOG_DEFAULT_KEYWORDS,
  BLOG_DEFAULT_LANGUAGE,
  BLOG_DEFAULT_OG_IMAGE,
} from "@/config/blog";
import { normalizeBlogAssetPath } from "@/lib/blog/assets";
import { createEmptyBlogDoc } from "@/lib/blog/doc";
import { createBlogSlug, normalizeGroupId } from "@/lib/blog/slug";
import type { BlogLanguage, BlogPostRecord, BlogPostSeo } from "@/types/blog";

export const createBlogSeoDefaults = (input?: Partial<BlogPostSeo>): BlogPostSeo => {
  const keywords = Array.isArray(input?.keywords)
    ? input!.keywords.filter(Boolean)
    : BLOG_DEFAULT_KEYWORDS;

  return {
    metaTitle: input?.metaTitle?.trim() || "",
    metaDescription: input?.metaDescription?.trim() || "",
    keywords,
    ogImage: input?.ogImage?.trim() || BLOG_DEFAULT_OG_IMAGE,
  };
};

export const createEmptyBlogPostRecord = (
  lang: BlogLanguage = BLOG_DEFAULT_LANGUAGE,
  seed?: Partial<BlogPostRecord>,
): BlogPostRecord => {
  const now = new Date().toISOString();
  const groupId = normalizeGroupId(seed?.groupId || seed?.title || "new-blog-post");
  const title = seed?.title?.trim() || "";
  const coverImage = normalizeBlogAssetPath(groupId, seed?.coverImage || "");
  const tags = Array.isArray(seed?.tags) ? seed!.tags.filter(Boolean) : [];

  return {
    groupId,
    lang,
    slug: seed?.slug?.trim() || createBlogSlug(title || groupId),
    status: seed?.status || "draft",
    featured: seed?.featured ?? false,
    coverImage,
    tags,
    createdAt: seed?.createdAt || now,
    updatedAt: seed?.updatedAt || now,
    publishedAt: seed?.publishedAt ?? null,
    title,
    excerpt: seed?.excerpt?.trim() || "",
    seo: createBlogSeoDefaults({
      metaTitle: seed?.seo?.metaTitle || title,
      metaDescription: seed?.seo?.metaDescription || seed?.excerpt || "",
      keywords: seed?.seo?.keywords?.length ? seed.seo.keywords : tags.length ? tags : BLOG_DEFAULT_KEYWORDS,
      ogImage: normalizeBlogAssetPath(groupId, seed?.seo?.ogImage || coverImage || BLOG_DEFAULT_OG_IMAGE),
    }),
    doc: seed?.doc || createEmptyBlogDoc(),
  };
};

export const createEmptyBlogGroupRecordSet = (groupId: string, languages: BlogLanguage[]) =>
  languages.reduce(
    (acc, lang) => {
      acc[lang] = createEmptyBlogPostRecord(lang, {
        groupId,
        slug: groupId,
      });
      return acc;
    },
    {} as Record<BlogLanguage, BlogPostRecord>,
  );

export const getDefaultBlogAuthorName = () => BLOG_DEFAULT_AUTHOR_NAME;
