import { BLOG_DEFAULT_LANGUAGE, BLOG_LANGUAGES } from "@/config/blog";
import { normalizeGroupId, normalizeSlug } from "@/lib/blog/slug";
import type {
  BlogLanguage,
  BlogLanguageSlugMap,
  BlogPostGroup,
  BlogPostRecord,
} from "@/types/blog";

const postModules = import.meta.glob("/src/content/blog/posts/*/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const asBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const asStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const sortBlogPostsForListing = (posts: BlogPostRecord[]) =>
  [...posts].sort((a, b) => {
    if (a.featured !== b.featured) return Number(b.featured) - Number(a.featured);

    const aDate = new Date(a.publishedAt || a.updatedAt || a.createdAt).getTime();
    const bDate = new Date(b.publishedAt || b.updatedAt || b.createdAt).getTime();
    return bDate - aDate;
  });

const normalizeBlogRecord = (input: unknown): BlogPostRecord | null => {
  if (!isPlainObject(input)) return null;

  const lang = asString(input.lang) as BlogLanguage;
  if (!BLOG_LANGUAGES.includes(lang)) return null;

  const groupId = normalizeGroupId(asString(input.groupId));
  const slug = normalizeSlug(asString(input.slug));

  if (!groupId || !slug) return null;

  return {
    groupId,
    lang,
    slug,
    status: asString(input.status, "draft") === "published" ? "published" : "draft",
    featured: asBoolean(input.featured),
    coverImage: asString(input.coverImage),
    tags: asStringArray(input.tags),
    createdAt: asString(input.createdAt) || new Date().toISOString(),
    updatedAt: asString(input.updatedAt) || asString(input.createdAt) || new Date().toISOString(),
    publishedAt: asString(input.publishedAt) || null,
    title: asString(input.title),
    excerpt: asString(input.excerpt),
    seo: isPlainObject(input.seo)
      ? {
          metaTitle: asString(input.seo.metaTitle),
          metaDescription: asString(input.seo.metaDescription),
          keywords: asStringArray(input.seo.keywords),
          ogImage: asString(input.seo.ogImage),
        }
      : {
          metaTitle: "",
          metaDescription: "",
          keywords: [],
          ogImage: "",
        },
    doc: isPlainObject(input.doc)
      ? (input.doc as BlogPostRecord["doc"])
      : ({
          type: "doc",
          content: [],
        } as BlogPostRecord["doc"]),
  };
};

const allBlogPosts = Object.values(postModules)
  .map((entry) => normalizeBlogRecord(entry))
  .filter((entry): entry is BlogPostRecord => !!entry);

export const getAllBlogPosts = () => [...allBlogPosts];

export const getPublishedBlogPosts = (lang?: BlogLanguage) =>
  sortBlogPostsForListing(
    allBlogPosts.filter(
      (post) => post.status === "published" && (!lang || post.lang === lang),
    ),
  );

export const getFeaturedBlogPosts = (
  lang: BlogLanguage = BLOG_DEFAULT_LANGUAGE,
  limit = 3,
) => getPublishedBlogPosts(lang).filter((post) => post.featured).slice(0, limit);

export const getBlogPostBySlug = (
  lang: BlogLanguage,
  slug: string,
): BlogPostRecord | null => {
  const normalizedSlug = normalizeSlug(slug);
  return (
    getPublishedBlogPosts(lang).find((post) => post.slug === normalizedSlug) || null
  );
};

export const getBlogGroupTranslations = (groupId: string) => {
  const normalizedGroupId = normalizeGroupId(groupId);

  return BLOG_LANGUAGES.reduce((acc, lang) => {
    const translation =
      allBlogPosts.find(
        (post) => post.groupId === normalizedGroupId && post.lang === lang,
      ) || null;

    if (translation) {
      acc[lang] = translation;
    }

    return acc;
  }, {} as Partial<Record<BlogLanguage, BlogPostRecord>>);
};

export const getBlogLanguageSlugs = (groupId: string): BlogLanguageSlugMap => {
  const translations = getBlogGroupTranslations(groupId);

  return BLOG_LANGUAGES.reduce((acc, lang) => {
    const translation = translations[lang];
    if (translation?.slug) {
      acc[lang] = translation.slug;
    }
    return acc;
  }, {} as BlogLanguageSlugMap);
};

export const getRelatedBlogPosts = (
  currentPost: BlogPostRecord,
  limit = 3,
) => {
  const currentTags = new Set(currentPost.tags.map((tag) => tag.toLowerCase()));

  return getPublishedBlogPosts(currentPost.lang)
    .filter((post) => post.groupId !== currentPost.groupId)
    .map((post) => ({
      post,
      score: post.tags.reduce(
        (count, tag) => count + Number(currentTags.has(tag.toLowerCase())),
        0,
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;

      const aDate = new Date(
        a.post.publishedAt || a.post.updatedAt || a.post.createdAt,
      ).getTime();
      const bDate = new Date(
        b.post.publishedAt || b.post.updatedAt || b.post.createdAt,
      ).getTime();

      return bDate - aDate;
    })
    .slice(0, limit)
    .map((entry) => entry.post);
};

export const getBlogGroupsForAdmin = (): BlogPostGroup[] => {
  const grouped = new Map<string, Partial<Record<BlogLanguage, BlogPostRecord>>>();

  allBlogPosts.forEach((post) => {
    if (!grouped.has(post.groupId)) {
      grouped.set(post.groupId, {});
    }
    grouped.get(post.groupId)![post.lang] = post;
  });

  return Array.from(grouped.entries())
    .map(([groupId, translations]) => {
      const orderedTranslations = BLOG_LANGUAGES.reduce((acc, lang) => {
        if (translations[lang]) {
          acc[lang] = translations[lang]!;
        }
        return acc;
      }, {} as Partial<Record<BlogLanguage, BlogPostRecord>>);

      const firstTranslation =
        orderedTranslations[BLOG_DEFAULT_LANGUAGE] ||
        Object.values(orderedTranslations)[0];

      if (!firstTranslation) return null;

      return {
        groupId,
        availableLanguages: BLOG_LANGUAGES.filter((lang) => !!orderedTranslations[lang]),
        featured: firstTranslation.featured,
        coverImage: firstTranslation.coverImage,
        tags: firstTranslation.tags,
        createdAt: firstTranslation.createdAt,
        updatedAt: firstTranslation.updatedAt,
        publishedAt: firstTranslation.publishedAt,
        translations: orderedTranslations,
      } as BlogPostGroup;
    })
    .filter((entry): entry is BlogPostGroup => !!entry)
    .sort((a, b) => {
      const aDate = new Date(a.updatedAt || a.createdAt).getTime();
      const bDate = new Date(b.updatedAt || b.createdAt).getTime();
      return bDate - aDate;
    });
};

export const buildBlogPostPath = (lang: BlogLanguage, slug: string) =>
  `/${lang}/blog/${normalizeSlug(slug)}`;

export const buildBlogIndexPath = (lang: BlogLanguage) => `/${lang}/blog`;
