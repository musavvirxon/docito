import { BLOG_LANGUAGES } from "@/config/blog";
import { hasMeaningfulBlogDocContent } from "@/lib/blog/doc";
import type {
  BlogChecklistItem,
  BlogGlobalChecklist,
  BlogGroupChecklistResult,
  BlogLanguage,
  BlogLanguageChecklist,
  BlogPostRecord,
} from "@/types/blog";

const languageLabels: Record<string, string> = {
  title: "Title exists",
  excerpt: "Excerpt exists",
  slug: "Slug exists",
  body: "Body exists",
  metaTitle: "Meta title exists",
  metaDescription: "Meta description exists",
  keywords: "Keywords exist",
  ogImage: "OG image exists",
  coverImage: "Cover image exists",
};

const globalLabels: Record<string, string> = {
  groupId: "Group ID exists",
  coverImage: "Cover image exists",
  publishableLanguage: "At least one publishable language exists",
};

const buildLanguageItems = (post?: BlogPostRecord | null): BlogChecklistItem[] => {
  const bodyExists = post ? hasMeaningfulBlogDocContent(post.doc) : false;

  return [
    { key: "title", label: languageLabels.title, passed: !!post?.title?.trim() },
    { key: "excerpt", label: languageLabels.excerpt, passed: !!post?.excerpt?.trim() },
    { key: "slug", label: languageLabels.slug, passed: !!post?.slug?.trim() },
    { key: "body", label: languageLabels.body, passed: bodyExists },
    { key: "metaTitle", label: languageLabels.metaTitle, passed: !!post?.seo?.metaTitle?.trim() },
    {
      key: "metaDescription",
      label: languageLabels.metaDescription,
      passed: !!post?.seo?.metaDescription?.trim(),
    },
    {
      key: "keywords",
      label: languageLabels.keywords,
      passed: !!post?.seo?.keywords?.length,
    },
    { key: "ogImage", label: languageLabels.ogImage, passed: !!post?.seo?.ogImage?.trim() },
    {
      key: "coverImage",
      label: languageLabels.coverImage,
      passed: !!post?.coverImage?.trim(),
    },
  ];
};

export const createBlogLanguageChecklist = (
  lang: BlogLanguage,
  post?: BlogPostRecord | null,
): BlogLanguageChecklist => {
  const items = buildLanguageItems(post);
  const missingKeys = items.filter((item) => !item.passed).map((item) => item.key) as BlogLanguageChecklist["missingKeys"];

  return {
    lang,
    items,
    passed: missingKeys.length === 0,
    missingKeys,
  };
};

export const createBlogGlobalChecklist = (
  posts: Partial<Record<BlogLanguage, BlogPostRecord>>,
  requiredLanguages: BlogLanguage[],
): BlogGlobalChecklist => {
  const firstAvailable = requiredLanguages
    .map((lang) => posts[lang])
    .find((post): post is BlogPostRecord => !!post);

  const publishableLanguages = requiredLanguages.filter((lang) =>
    createBlogLanguageChecklist(lang, posts[lang]).passed,
  );

  const items: BlogChecklistItem[] = [
    {
      key: "groupId",
      label: globalLabels.groupId,
      passed: !!firstAvailable?.groupId?.trim(),
    },
    {
      key: "coverImage",
      label: globalLabels.coverImage,
      passed: !!firstAvailable?.coverImage?.trim(),
    },
    {
      key: "publishableLanguage",
      label: globalLabels.publishableLanguage,
      passed: publishableLanguages.length > 0,
    },
  ];

  const missingKeys = items.filter((item) => !item.passed).map((item) => item.key) as BlogGlobalChecklist["missingKeys"];

  return {
    items,
    passed: missingKeys.length === 0,
    missingKeys,
  };
};

export const createBlogGroupChecklist = (
  posts: Partial<Record<BlogLanguage, BlogPostRecord>>,
  requiredLanguages: BlogLanguage[] = [...BLOG_LANGUAGES],
): BlogGroupChecklistResult => {
  const languageEntries = requiredLanguages.map((lang) => [
    lang,
    createBlogLanguageChecklist(lang, posts[lang]),
  ]) as Array<[BlogLanguage, BlogLanguageChecklist]>;

  const languages = Object.fromEntries(languageEntries) as Record<BlogLanguage, BlogLanguageChecklist>;
  const global = createBlogGlobalChecklist(posts, requiredLanguages);
  const publishableLanguages = requiredLanguages.filter((lang) => languages[lang].passed);

  return {
    requiredLanguages,
    languages,
    global,
    passed: global.passed && requiredLanguages.every((lang) => languages[lang].passed),
    publishableLanguages,
  };
};
