import { BLOG_DEFAULT_EMPTY_DOC } from "@/config/blog";
import type { BlogDoc, BlogDocNode } from "@/types/blog";

export const createEmptyBlogDoc = (): BlogDoc =>
  JSON.parse(JSON.stringify(BLOG_DEFAULT_EMPTY_DOC)) as BlogDoc;

const walkBlogDoc = (node: BlogDocNode, visit: (node: BlogDocNode) => void) => {
  visit(node);
  if (Array.isArray(node.content)) {
    node.content.forEach((child) => walkBlogDoc(child, visit));
  }
};

export const normalizeBlogDoc = (value: unknown): BlogDoc => {
  if (!value || typeof value !== "object") return createEmptyBlogDoc();

  const candidate = value as Partial<BlogDoc>;
  if (candidate.type !== "doc") return createEmptyBlogDoc();
  if (!Array.isArray(candidate.content)) {
    return {
      type: "doc",
      content: [],
    };
  }

  return {
    type: "doc",
    content: candidate.content as BlogDocNode[],
  };
};

export const getBlogDocText = (doc: BlogDoc) => {
  const parts: string[] = [];

  walkBlogDoc(doc, (node) => {
    if (typeof node.text === "string" && node.text.trim()) {
      parts.push(node.text.trim());
    }
  });

  return parts.join(" ").replace(/\s+/g, " ").trim();
};

export const countBlogDocWords = (doc: BlogDoc) => {
  const text = getBlogDocText(doc);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
};

export const hasMeaningfulBlogDocContent = (doc: BlogDoc) => {
  if (countBlogDocWords(doc) > 0) return true;

  let hasMedia = false;
  walkBlogDoc(doc, (node) => {
    if (["image", "videoEmbed", "iframeEmbed", "embed"].includes(node.type)) {
      hasMedia = true;
    }
  });

  return hasMedia;
};

export const estimateBlogReadingMinutes = (doc: BlogDoc, wordsPerMinute = 220) => {
  const words = countBlogDocWords(doc);
  return Math.max(1, Math.ceil(words / wordsPerMinute));
};

export const getBlogDocExcerpt = (doc: BlogDoc, maxLength = 180) => {
  const text = getBlogDocText(doc);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
};
