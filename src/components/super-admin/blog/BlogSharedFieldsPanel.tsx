import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { BlogStudioDraft } from "@/lib/blog/studio-api";
import { FolderTree, ImageIcon, Sparkles, Tag } from "lucide-react";

interface BlogSharedFieldsPanelProps {
  draft: BlogStudioDraft;
  onChangeGroupId: (value: string) => void;
  onChangeCoverImage: (value: string) => void;
  onChangeTags: (value: string) => void;
  onChangeFeatured: (value: boolean) => void;
}

export default function BlogSharedFieldsPanel({
  draft,
  onChangeGroupId,
  onChangeCoverImage,
  onChangeTags,
  onChangeFeatured,
}: BlogSharedFieldsPanelProps) {
  const active = draft.translations[draft.activeLanguage];

  return (
    <div className="space-y-4 rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-foreground">Shared post fields</div>
          <p className="text-xs text-muted-foreground">
            These values stay consistent across the whole translation group.
          </p>
        </div>

        <Badge variant="outline">Group-wide</Badge>
      </div>

      <div className="space-y-2">
        <Label htmlFor="blog-group-id" className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-primary" />
          Group ID
        </Label>
        <Input
          id="blog-group-id"
          value={draft.groupId}
          onChange={(event) => onChangeGroupId(event.target.value)}
          placeholder="group-id"
        />
        <p className="text-xs text-muted-foreground">
          Used to connect all language files under a single post group.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="blog-cover-image" className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          Cover image
        </Label>
        <Input
          id="blog-cover-image"
          value={active.coverImage}
          onChange={(event) => onChangeCoverImage(event.target.value)}
          placeholder="/blog/group-id/cover.webp"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="blog-tags" className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          Tags
        </Label>
        <Input
          id="blog-tags"
          value={active.tags.join(", ")}
          onChange={(event) => onChangeTags(event.target.value)}
          placeholder="doctor, clinic, medical platform"
        />
        <p className="text-xs text-muted-foreground">
          Separate tags with commas. Tags are reused for related posts and keyword autofill.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Featured post
          </div>
          <div className="text-xs text-muted-foreground">
            Promote this post group into featured placements on the public blog.
          </div>
        </div>
        <Switch checked={active.featured} onCheckedChange={onChangeFeatured} />
      </div>
    </div>
  );
}
