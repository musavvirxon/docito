import { BLOG_RELATED_POSTS_LIMIT } from "@/config/blog";
import { compareBlogPostsByPublishedDateDesc } from "@/lib/blog/sort";
import type { BlogPostRecord } from "@/types/blog";

const getTagOverlapScore = (sourceTags: string[], candidateTags: string[]) => {
  const source = new Set(sourceTags.map((tag) => tag.toLowerCase()));
  return candidateTags.reduce((score, tag) => score + Number(source.has(tag.toLowerCase())), 0);
};

export const getRelatedBlogPosts = (
  currentPost: BlogPostRecord,
  candidates: BlogPostRecord[],
  limit = BLOG_RELATED_POSTS_LIMIT,
) =>
  [...candidates]
    .filter(
      (candidate) =>
        candidate.groupId !== currentPost.groupId &&
        candidate.lang === currentPost.lang &&
        candidate.tags.length > 0,
    )
    .map((candidate) => ({
      candidate,
      score: getTagOverlapScore(currentPost.tags, candidate.tags),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.candidate.featured !== b.candidate.featured) {
        return Number(b.candidate.featured) - Number(a.candidate.featured);
      }
      return compareBlogPostsByPublishedDateDesc(a.candidate, b.candidate);
    })
    .slice(0, limit)
    .map((entry) => entry.candidate);
