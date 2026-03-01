import { BLOG_DEFAULT_LANGUAGE, BLOG_LANGUAGES } from "@/config/blog";
import type { BlogLanguage } from "@/types/blog";

const fallbackSlug = "untitled-post";

export const normalizeSlug = (value: string) => {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return normalized || fallbackSlug;
};

export const normalizeGroupId = (value: string) => normalizeSlug(value);

export const createBlogSlug = (title: string, fallback = fallbackSlug) => {
  const slug = normalizeSlug(title);
  return slug || fallback;
};

export const createUniqueBlogSlug = (input: string, existingSlugs: string[] = []) => {
  const base = normalizeSlug(input);
  if (!existingSlugs.includes(base)) return base;

  let counter = 2;
  let candidate = `${base}-${counter}`;
  while (existingSlugs.includes(candidate)) {
    counter += 1;
    candidate = `${base}-${counter}`;
  }
  return candidate;
};

export const inferLanguageFromSlugPath = (pathname: string): BlogLanguage => {
  const parts = pathname.split("/").filter(Boolean);
  const maybeLang = parts[0];
  return BLOG_LANGUAGES.includes(maybeLang as BlogLanguage)
    ? (maybeLang as BlogLanguage)
    : BLOG_DEFAULT_LANGUAGE;
};

export const buildBlogIndexPath = (lang: BlogLanguage) => `/${lang}/blog`;

export const buildBlogPostPath = (lang: BlogLanguage, slug: string) => `/${lang}/blog/${slug}`;
