import {
  BLOG_DEFAULT_AUTHOR_NAME,
  BLOG_DEFAULT_OG_IMAGE,
  BLOG_DEFAULT_SITE_NAME,
  BLOG_LANGUAGES,
} from "@/config/blog";
import { toAbsoluteAssetUrl } from "@/lib/blog/assets";
import { buildBlogIndexPath, buildBlogPostPath } from "@/lib/blog/slug";
import type { BlogArticleStructuredData, BlogLanguage, BlogSeoInput, BlogTranslationLink } from "@/types/blog";

const normalizeBaseUrl = (value?: string) => {
  const fallback = "https://docito.app";
  if (!value?.trim()) return fallback;
  return value.replace(/\/+$/, "");
};

export const getBlogSiteUrl = () =>
  normalizeBaseUrl(
    import.meta.env.VITE_SITE_URL ||
      import.meta.env.VITE_PUBLIC_SITE_URL ||
      import.meta.env.VITE_APP_URL,
  );

export const getBlogCanonicalUrl = (lang: BlogLanguage, slug: string, siteUrl = getBlogSiteUrl()) =>
  `${normalizeBaseUrl(siteUrl)}${buildBlogPostPath(lang, slug)}`;

export const getBlogIndexCanonicalUrl = (lang: BlogLanguage, siteUrl = getBlogSiteUrl()) =>
  `${normalizeBaseUrl(siteUrl)}${buildBlogIndexPath(lang)}`;

export const buildBlogAlternateLanguageLinks = (
  translations: Array<{ lang: BlogLanguage; slug: string; title: string }>,
  siteUrl = getBlogSiteUrl(),
): BlogTranslationLink[] =>
  translations.map((translation) => ({
    lang: translation.lang,
    slug: translation.slug,
    title: translation.title,
    href: getBlogCanonicalUrl(translation.lang, translation.slug, siteUrl),
  }));

export const createBlogArticleStructuredData = ({
  siteUrl = getBlogSiteUrl(),
  lang,
  slug,
  title,
  description,
  image,
  publishedAt,
  updatedAt,
  tags = [],
  authorName = BLOG_DEFAULT_AUTHOR_NAME,
}: BlogSeoInput): BlogArticleStructuredData => {
  const resolvedSiteUrl = normalizeBaseUrl(siteUrl);
  const resolvedImage = toAbsoluteAssetUrl(resolvedSiteUrl, image || BLOG_DEFAULT_OG_IMAGE);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    inLanguage: lang,
    mainEntityOfPage: getBlogCanonicalUrl(lang, slug, resolvedSiteUrl),
    image: resolvedImage ? [resolvedImage] : undefined,
    datePublished: publishedAt || undefined,
    dateModified: updatedAt || publishedAt || undefined,
    author: {
      "@type": "Organization",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: BLOG_DEFAULT_SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: toAbsoluteAssetUrl(resolvedSiteUrl, "/logos/horizontal/docito-horizontal-sm.png"),
      },
    },
    keywords: tags.length ? tags.join(", ") : undefined,
  };
};

export const getBlogHreflangMap = (
  translations: Array<{ lang: BlogLanguage; slug: string; title: string }>,
  siteUrl = getBlogSiteUrl(),
) => {
  const alternates = buildBlogAlternateLanguageLinks(translations, siteUrl);
  const map = alternates.reduce<Record<string, string>>((acc, item) => {
    acc[item.lang] = item.href;
    return acc;
  }, {});
  map["x-default"] =
    alternates.find((item) => item.lang === "en")?.href ||
    alternates[0]?.href ||
    getBlogIndexCanonicalUrl("en", siteUrl);
  return map;
};

export const getBlogLanguageAlternatesForIndex = (siteUrl = getBlogSiteUrl()) =>
  BLOG_LANGUAGES.map((lang) => ({
    lang,
    href: getBlogIndexCanonicalUrl(lang, siteUrl),
  }));
