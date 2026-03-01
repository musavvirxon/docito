import { useMemo, useState } from "react";
import { BLOG_DEFAULT_LANGUAGE } from "@/config/blog";
import type { BlogStudioListItem } from "@/lib/blog/studio-api";
import type { BlogLanguage, BlogPostStatus } from "@/types/blog";

export type BlogStudioFeaturedFilter = "all" | "featured" | "not_featured";
export type BlogStudioSourceFilter = "all" | "published" | "draft" | "mixed";

export interface BlogStudioFilterState {
  query: string;
  status: "all" | BlogPostStatus;
  tag: string;
  featured: BlogStudioFeaturedFilter;
  lang: "all" | BlogLanguage;
  source: BlogStudioSourceFilter;
}

const matchesQuery = (item: BlogStudioListItem, query: string) => {
  if (!query) return true;
  const normalized = query.trim().toLowerCase();

  const haystack = [
    item.groupId,
    ...Object.values(item.titles || {}),
    ...Object.values(item.slugs || {}),
    ...item.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
};

const matchesStatus = (item: BlogStudioListItem, status: "all" | BlogPostStatus) =>
  status === "all" ? true : item.statuses.includes(status);

const matchesTag = (item: BlogStudioListItem, tag: string) =>
  !tag ? true : item.tags.some((itemTag) => itemTag.toLowerCase() === tag.trim().toLowerCase());

const matchesFeatured = (item: BlogStudioListItem, featured: BlogStudioFeaturedFilter) => {
  if (featured === "all") return true;
  if (featured === "featured") return item.featured;
  return !item.featured;
};

const matchesLanguage = (item: BlogStudioListItem, lang: "all" | BlogLanguage) =>
  lang === "all" ? true : item.availableLanguages.includes(lang);

const matchesSource = (item: BlogStudioListItem, source: BlogStudioSourceFilter) =>
  source === "all" ? true : item.source === source;

export const useBlogFilters = (items: BlogStudioListItem[]) => {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | BlogPostStatus>("all");
  const [tag, setTag] = useState("");
  const [featured, setFeatured] = useState<BlogStudioFeaturedFilter>("all");
  const [lang, setLang] = useState<"all" | BlogLanguage>("all");
  const [source, setSource] = useState<BlogStudioSourceFilter>("all");

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          matchesQuery(item, query) &&
          matchesStatus(item, status) &&
          matchesTag(item, tag) &&
          matchesFeatured(item, featured) &&
          matchesLanguage(item, lang) &&
          matchesSource(item, source),
      ),
    [featured, items, lang, query, source, status, tag],
  );

  const availableTags = useMemo(
    () =>
      Array.from(new Set(items.flatMap((item) => item.tags)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const counts = useMemo(
    () => ({
      all: items.length,
      published: items.filter((item) => item.source === "published").length,
      draft: items.filter((item) => item.source === "draft").length,
      mixed: items.filter((item) => item.source === "mixed").length,
      featured: items.filter((item) => item.featured).length,
    }),
    [items],
  );

  const resetFilters = () => {
    setQuery("");
    setStatus("all");
    setTag("");
    setFeatured("all");
    setLang("all");
    setSource("all");
  };

  const filterState: BlogStudioFilterState = {
    query,
    status,
    tag,
    featured,
    lang,
    source,
  };

  return {
    filterState,
    query,
    setQuery,
    status,
    setStatus,
    tag,
    setTag,
    featured,
    setFeatured,
    lang,
    setLang,
    source,
    setSource,
    availableTags,
    filteredItems,
    counts,
    resetFilters,
    defaultLanguage: BLOG_DEFAULT_LANGUAGE,
  };
};
