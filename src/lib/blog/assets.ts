import { BLOG_PUBLIC_ASSET_ROOT } from "@/config/blog";
import { normalizeGroupId } from "@/lib/blog/slug";

export const isExternalBlogAsset = (value?: string | null) =>
  !!value && /^(https?:)?\/\//i.test(value);

export const cleanAssetValue = (value?: string | null) => {
  if (!value) return "";
  return value.trim();
};

export const getBlogAssetFilename = (value?: string | null) => {
  const cleaned = cleanAssetValue(value);
  if (!cleaned) return "";
  const withoutQuery = cleaned.split("?")[0].split("#")[0];
  const parts = withoutQuery.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
};

export const getBlogAssetDirectory = (groupId: string) =>
  `${BLOG_PUBLIC_ASSET_ROOT}/${normalizeGroupId(groupId)}`;

export const toBlogAssetPublicPath = (groupId: string, filenameOrPath?: string | null) => {
  const cleaned = cleanAssetValue(filenameOrPath);
  if (!cleaned) return "";
  if (isExternalBlogAsset(cleaned)) return cleaned;
  if (cleaned.startsWith(`${BLOG_PUBLIC_ASSET_ROOT}/`)) return cleaned;
  const filename = getBlogAssetFilename(cleaned);
  if (!filename) return "";
  return `${getBlogAssetDirectory(groupId)}/${filename}`;
};

export const normalizeBlogAssetPath = (groupId: string, value?: string | null) => {
  const cleaned = cleanAssetValue(value);
  if (!cleaned) return "";
  if (isExternalBlogAsset(cleaned)) return cleaned;
  return toBlogAssetPublicPath(groupId, cleaned);
};

export const toAbsoluteAssetUrl = (siteUrl: string, value?: string | null) => {
  const cleaned = cleanAssetValue(value);
  if (!cleaned) return "";
  if (isExternalBlogAsset(cleaned)) return cleaned;
  const base = siteUrl.replace(/\/+$/, "");
  const path = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  return `${base}${path}`;
};
