import { buildBlogPostPath } from "@/lib/blog/slug";
import type { BlogLanguage, BlogManifestItem, BlogPostGroup, BlogPostRecord } from "@/types/blog";

export const groupBlogPostsByGroupId = (posts: BlogPostRecord[]) =>
  posts.reduce<Record<string, BlogPostRecord[]>>((acc, post) => {
    if (!acc[post.groupId]) acc[post.groupId] = [];
    acc[post.groupId].push(post);
    return acc;
  }, {});

export const buildBlogGroups = (posts: BlogPostRecord[]): BlogPostGroup[] =>
  Object.entries(groupBlogPostsByGroupId(posts)).map(([groupId, translations]) => {
    const ordered = [...translations].sort((a, b) =>
      a.lang === "en" ? -1 : b.lang === "en" ? 1 : a.lang.localeCompare(b.lang),
    );
    const primary = ordered[0];

    return {
      groupId,
      featured: ordered.some((post) => post.featured),
      coverImage: primary?.coverImage || "",
      tags: [...new Set(ordered.flatMap((post) => post.tags))],
      createdAt: ordered.reduce(
        (earliest, post) => (!earliest || post.createdAt < earliest ? post.createdAt : earliest),
        "",
      ),
      updatedAt: ordered.reduce(
        (latest, post) => (!latest || post.updatedAt > latest ? post.updatedAt : latest),
        "",
      ),
      publishedAt: ordered.reduce<string | null>(
        (latest, post) => {
          if (!post.publishedAt) return latest;
          if (!latest || post.publishedAt > latest) return post.publishedAt;
          return latest;
        },
        null,
      ),
      availableLanguages: ordered.map((post) => post.lang),
      translations: ordered.reduce<Partial<Record<BlogLanguage, BlogPostRecord>>>((acc, post) => {
        acc[post.lang] = post;
        return acc;
      }, {}),
    };
  });

export const buildBlogManifest = (posts: BlogPostRecord[]): BlogManifestItem[] => {
  const groups = buildBlogGroups(posts);

  return groups.flatMap((group) =>
    group.availableLanguages.map((lang) => {
      const translation = group.translations[lang]!;
      return {
        groupId: group.groupId,
        lang,
        slug: translation.slug,
        href: buildBlogPostPath(lang, translation.slug),
        title: translation.title,
        excerpt: translation.excerpt,
        featured: translation.featured,
        tags: translation.tags,
        coverImage: translation.coverImage,
        createdAt: translation.createdAt,
        updatedAt: translation.updatedAt,
        publishedAt: translation.publishedAt,
        availableLanguages: group.availableLanguages,
      };
    }),
  );
};
