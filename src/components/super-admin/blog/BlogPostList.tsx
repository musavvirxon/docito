import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { BlogStudioListItem } from "@/lib/blog/studio-api";
import { BookOpenText, CircleDot, Languages, PenSquare, Sparkles } from "lucide-react";

interface BlogPostListProps {
  items: BlogStudioListItem[];
  selectedGroupId: string | null;
  onSelect: (groupId: string) => void;
  isLoading?: boolean;
}

const sourceLabelMap: Record<BlogStudioListItem["source"], string> = {
  published: "Published",
  draft: "Local draft",
  mixed: "Published + draft",
};

export default function BlogPostList({
  items,
  selectedGroupId,
  onSelect,
  isLoading = false,
}: BlogPostListProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl bg-muted/60" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BookOpenText className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No blog groups found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Adjust the filters or create a new blog draft from the Blog Studio toolbar.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Post groups</h3>
        <p className="text-xs text-muted-foreground">
          Select a row to open a local editing draft for that group.
        </p>
      </div>

      <ScrollArea className="h-[620px]">
        <div className="space-y-2 p-3">
          {items.map((item) => {
            const primaryTitle =
              item.titles.en ||
              Object.values(item.titles).find(Boolean) ||
              item.groupId;

            return (
              <Button
                key={item.groupId}
                type="button"
                variant="ghost"
                onClick={() => onSelect(item.groupId)}
                className={cn(
                  "h-auto w-full justify-start rounded-xl border px-4 py-3 text-left",
                  selectedGroupId === item.groupId
                    ? "border-primary bg-primary/5 hover:bg-primary/10"
                    : "border-border bg-background hover:bg-muted/40",
                )}
              >
                <div className="w-full space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="line-clamp-2 text-sm font-semibold text-foreground">
                        {primaryTitle}
                      </div>
                      <div className="text-xs text-muted-foreground">{item.groupId}</div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      {item.featured ? (
                        <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
                          <Sparkles className="mr-1 h-3 w-3" />
                          Featured
                        </Badge>
                      ) : null}

                      {item.hasLocalDraft ? (
                        <Badge variant="outline">
                          <PenSquare className="mr-1 h-3 w-3" />
                          Draft
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{sourceLabelMap[item.source]}</Badge>
                    <Badge variant="outline">
                      <Languages className="mr-1 h-3 w-3" />
                      {item.availableLanguages.length} languages
                    </Badge>
                    <Badge variant="outline">
                      <CircleDot className="mr-1 h-3 w-3" />
                      {item.statuses.join(", ") || "unknown"}
                    </Badge>
                  </div>

                  {item.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.slice(0, 4).map((tag) => (
                        <Badge key={tag} variant="secondary" className="font-normal">
                          #{tag}
                        </Badge>
                      ))}
                      {item.tags.length > 4 ? (
                        <Badge variant="secondary" className="font-normal">
                          +{item.tags.length - 4}
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
