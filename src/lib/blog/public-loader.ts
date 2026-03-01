import { BLOG_STATIC_POST_GLOB } from "@/config/blog";
import { buildBlogGroups, buildBlogManifest } from "@/lib/blog/manifest";
import { getRelatedBlogPosts } from "@/lib/blog/related";
import { sortBlogGroupsForAdmin, sortBlogPostsForListing } from "@/lib/blog/sort";
import { parseBlogPostRecord, safeParseBlogPostRecord } from "@/lib/blog/schema";
import { isBlogPostPublished } from "@/lib/blog/validation";
import type { BlogLanguage, BlogManifestItem, BlogPostGroup, BlogPostRecord } from "@/types/blog";

type GlobRecord = Record<string, unknown>;

const rawModules = import.meta.glob(BLOG_STATIC_POST_GLOB, {
  eager: true,
  import: "default",
}) as GlobRecord;

const parsePostsFromModules = () => {
  const validPosts: BlogPostRecord[] = [];
  const invalidFiles: Array<{ path: string; errors: string[] }> = [];

  Object.entries(rawModules).forEach(([path, value]) => {
    const safe = safeParseBlogPostRecord(value);

    if (!safe.success) {
      invalidFiles.push({
        path,
        errors: safe.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
      });
      return;
    }

    validPosts.push(parseBlogPostRecord(value));
  });

  if (invalidFiles.length > 0) {
    console.warn("[blog] Invalid blog content files were skipped.", invalidFiles);
  }

  return {
    validPosts,
    invalidFiles,
  };
};

const cache = parsePostsFromModules();

export const getAllBlogPosts = () => [...cache.validPosts];

export const getPublishedBlogPosts = (lang?: BlogLanguage) => {
  const posts = cache.validPosts.filter((post) => isBlogPostPublished(post));
  return sortBlogPostsForListing(lang ? posts.filter((post) => post.lang === lang) : posts);
};

export const getBlogPostBySlug = (lang: BlogLanguage, slug: string) =>
  getPublishedBlogPosts(lang).find((post) => post.slug === slug);

export const getBlogPostGroupById = (groupId: string): BlogPostGroup | undefined =>
  buildBlogGroups(cache.validPosts).find((group) => group.groupId === groupId);

export const getBlogGroupTranslations = (groupId: string) =>
  getBlogPostGroupById(groupId)?.translations || {};

export const getFeaturedBlogPosts = (lang: BlogLanguage, limit?: number) => {
  const featured = getPublishedBlogPosts(lang).filter((post) => post.featured);
  return typeof limit === "number" ? featured.slice(0, limit) : featured;
};

export const getRelatedPublishedBlogPosts = (
  post: BlogPostRecord,
  limit?: number,
): BlogPostRecord[] => {
  const candidates = getPublishedBlogPosts(post.lang);
  return getRelatedBlogPosts(post, candidates, limit);
};

export const getBlogManifest = (): BlogManifestItem[] =>
  buildBlogManifest(getPublishedBlogPosts()).sort((a, b) =>
    new Date(b.publishedAt || b.updatedAt).getTime() - new Date(a.publishedAt || a.updatedAt).getTime(),
  );

export const getBlogGroupsForAdmin = () => sortBlogGroupsForAdmin(buildBlogGroups(getAllBlogPosts()));

export const getBlogPostsForGroup = (groupId: string) =>
  getAllBlogPosts().filter((post) => post.groupId === groupId);

export const getBlogLanguageSlugs = (groupId: string) => {
  const group = getBlogPostGroupById(groupId);
  if (!group) return [];
  return group.availableLanguages.map((lang) => ({
    lang,
    slug: group.translations[lang]!.slug,
    title: group.translations[lang]!.title,
  }));
};

export const getBlogLoaderDiagnostics = () => ({
  totalFiles: Object.keys(rawModules).length,
  parsedPosts: cache.validPosts.length,
  invalidFiles: cache.invalidFiles,
});
