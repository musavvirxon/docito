import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BLOG_LANGUAGES, BLOG_POST_STATUSES } from "@/config/blog";
import type {
  BlogStudioFeaturedFilter,
  BlogStudioSourceFilter,
} from "@/hooks/blog/useBlogFilters";
import type { BlogLanguage, BlogPostStatus } from "@/types/blog";
import { Filter, Plus, RefreshCcw, Search } from "lucide-react";

interface BlogFiltersBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  status: "all" | BlogPostStatus;
  onStatusChange: (value: "all" | BlogPostStatus) => void;
  tag: string;
  onTagChange: (value: string) => void;
  featured: BlogStudioFeaturedFilter;
  onFeaturedChange: (value: BlogStudioFeaturedFilter) => void;
  lang: "all" | BlogLanguage;
  onLangChange: (value: "all" | BlogLanguage) => void;
  source: BlogStudioSourceFilter;
  onSourceChange: (value: BlogStudioSourceFilter) => void;
  availableTags: string[];
  counts: {
    all: number;
    published: number;
    draft: number;
    mixed: number;
    featured: number;
  };
  onCreateDraft: () => void;
  onReset: () => void;
}

export default function BlogFiltersBar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  tag,
  onTagChange,
  featured,
  onFeaturedChange,
  lang,
  onLangChange,
  source,
  onSourceChange,
  availableTags,
  counts,
  onCreateDraft,
  onReset,
}: BlogFiltersBarProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
            <Filter className="mr-1 h-3.5 w-3.5" />
            Blog filters
          </Badge>
          <Badge variant="outline">{counts.all} groups</Badge>
          <Badge variant="outline">{counts.featured} featured</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onReset}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button size="sm" onClick={onCreateDraft}>
            <Plus className="mr-2 h-4 w-4" />
            New draft
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-6">
        <div className="xl:col-span-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search title, slug, groupId, tag..."
              className="pl-9"
            />
          </div>
        </div>

        <Select value={status} onValueChange={(value) => onStatusChange(value as "all" | BlogPostStatus)}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {BLOG_POST_STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={featured} onValueChange={(value) => onFeaturedChange(value as BlogStudioFeaturedFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Featured" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All featured states</SelectItem>
            <SelectItem value="featured">Featured only</SelectItem>
            <SelectItem value="not_featured">Not featured</SelectItem>
          </SelectContent>
        </Select>

        <Select value={lang} onValueChange={(value) => onLangChange(value as "all" | BlogLanguage)}>
          <SelectTrigger>
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All languages</SelectItem>
            {BLOG_LANGUAGES.map((item) => (
              <SelectItem key={item} value={item}>
                {item.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={source} onValueChange={(value) => onSourceChange(value as BlogStudioSourceFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="published">Published only</SelectItem>
            <SelectItem value="draft">Draft only</SelectItem>
            <SelectItem value="mixed">Published + local draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_240px]">
        <Input
          value={tag}
          onChange={(event) => onTagChange(event.target.value)}
          placeholder={
            availableTags.length
              ? `Filter by tag. Available: ${availableTags.slice(0, 4).join(", ")}${availableTags.length > 4 ? "..." : ""}`
              : "Filter by tag"
          }
        />

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Published: {counts.published}</span>
          <span>Draft: {counts.draft}</span>
          <span>Mixed: {counts.mixed}</span>
        </div>
      </div>
    </div>
  );
}
