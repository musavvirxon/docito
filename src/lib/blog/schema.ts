import { z } from "zod";
import { BLOG_LANGUAGES, BLOG_POST_STATUSES } from "@/config/blog";
import { normalizeBlogAssetPath } from "@/lib/blog/assets";
import { normalizeBlogDoc } from "@/lib/blog/doc";
import { normalizeGroupId, normalizeSlug } from "@/lib/blog/slug";
import type { BlogDoc, BlogDocMark, BlogDocNode, BlogPostRecord, BlogPostSeo } from "@/types/blog";

const normalizeString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const normalizeStringArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeString(item))
      .filter(Boolean)
      .filter((item, index, array) => array.indexOf(item) === index);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item, index, array) => array.indexOf(item) === index);
  }

  return [];
};

const normalizeBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return false;
};

const normalizeNullableString = (value: unknown) => {
  const normalized = normalizeString(value);
  return normalized || null;
};

export const blogDocMarkSchema: z.ZodType<BlogDocMark> = z.object({
  type: z.string().min(1),
  attrs: z.record(z.string(), z.unknown()).optional(),
});

export const blogDocNodeSchema: z.ZodType<BlogDocNode> = z.lazy(() =>
  z.object({
    type: z.string().min(1),
    attrs: z.record(z.string(), z.unknown()).optional(),
    marks: z.array(blogDocMarkSchema).optional(),
    text: z.string().optional(),
    content: z.array(blogDocNodeSchema).optional(),
  }),
);

export const blogDocSchema: z.ZodType<BlogDoc> = z.object({
  type: z.literal("doc"),
  content: z.array(blogDocNodeSchema).default([]),
});

export const blogPostSeoSchema: z.ZodType<BlogPostSeo> = z.object({
  metaTitle: z.preprocess(normalizeString, z.string().default("")),
  metaDescription: z.preprocess(normalizeString, z.string().default("")),
  keywords: z.preprocess(normalizeStringArray, z.array(z.string()).default([])),
  ogImage: z.preprocess(normalizeString, z.string().default("")),
});

export const blogPostSchema: z.ZodType<BlogPostRecord> = z.object({
  groupId: z.preprocess((value) => normalizeGroupId(normalizeString(value)), z.string().min(1)),
  lang: z.enum(BLOG_LANGUAGES),
  slug: z.preprocess((value) => normalizeSlug(normalizeString(value)), z.string().min(1)),
  status: z.enum(BLOG_POST_STATUSES),
  featured: z.preprocess(normalizeBoolean, z.boolean().default(false)),
  coverImage: z.preprocess(normalizeString, z.string().default("")),
  tags: z.preprocess(normalizeStringArray, z.array(z.string()).default([])),
  createdAt: z.preprocess(normalizeString, z.string().min(1)),
  updatedAt: z.preprocess(normalizeString, z.string().min(1)),
  publishedAt: z.preprocess(normalizeNullableString, z.string().nullable().default(null)),
  title: z.preprocess(normalizeString, z.string().default("")),
  excerpt: z.preprocess(normalizeString, z.string().default("")),
  seo: blogPostSeoSchema,
  doc: z.preprocess((value) => normalizeBlogDoc(value), blogDocSchema),
});

export const safeParseBlogPostRecord = (input: unknown) => blogPostSchema.safeParse(input);

export const parseBlogPostRecord = (input: unknown) => {
  const parsed = blogPostSchema.parse(input);
  return {
    ...parsed,
    coverImage: normalizeBlogAssetPath(parsed.groupId, parsed.coverImage),
    seo: {
      ...parsed.seo,
      ogImage: normalizeBlogAssetPath(parsed.groupId, parsed.seo.ogImage),
    },
  };
};

export const parseBlogPostRecordArray = (inputs: unknown[]) => inputs.map(parseBlogPostRecord);
