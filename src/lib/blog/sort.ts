import type { BlogManifestItem, BlogPostGroup, BlogPostRecord } from "@/types/blog";

const toTime = (value?: string | null) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export const compareBlogPostsByPublishedDateDesc = (a: BlogPostRecord, b: BlogPostRecord) =>
  toTime(b.publishedAt || b.updatedAt) - toTime(a.publishedAt || a.updatedAt);

export const compareBlogPostsByUpdatedDateDesc = (a: BlogPostRecord, b: BlogPostRecord) =>
  toTime(b.updatedAt) - toTime(a.updatedAt);

export const compareBlogGroupsByUpdatedDateDesc = (a: BlogPostGroup, b: BlogPostGroup) =>
  toTime(b.updatedAt) - toTime(a.updatedAt);

export const compareBlogManifestByPublishedDateDesc = (a: BlogManifestItem, b: BlogManifestItem) =>
  toTime(b.publishedAt || b.updatedAt) - toTime(a.publishedAt || a.updatedAt);

export const sortBlogPostsForListing = (posts: BlogPostRecord[]) =>
  [...posts].sort((a, b) => {
    if (a.featured !== b.featured) return Number(b.featured) - Number(a.featured);
    return compareBlogPostsByPublishedDateDesc(a, b);
  });

export const sortBlogGroupsForAdmin = (groups: BlogPostGroup[]) =>
  [...groups].sort((a, b) => {
    if (a.featured !== b.featured) return Number(b.featured) - Number(a.featured);
    return compareBlogGroupsByUpdatedDateDesc(a, b);
  });
