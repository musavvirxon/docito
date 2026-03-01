import { useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BlogStudioAssetUploadInput } from "@/lib/blog/studio-api";
import { ImagePlus, Paperclip, Trash2, Upload } from "lucide-react";

export interface BlogAssetItem {
  filename: string;
  path: string;
  previewUrl: string;
  file: File;
}

interface BlogAssetManagerProps {
  groupId: string;
  assets: BlogAssetItem[];
  onAddAssets: (assets: BlogAssetItem[]) => void;
  onRemoveAsset: (filename: string) => void;
}

const buildAssetPath = (groupId: string, filename: string) => `/blog/${groupId}/${filename}`;

export const toStudioAssetUploads = (assets: BlogAssetItem[]): BlogStudioAssetUploadInput[] =>
  assets.map((asset) => ({
    filename: asset.filename,
    file: asset.file,
  }));

export default function BlogAssetManager({
  groupId,
  assets,
  onAddAssets,
  onRemoveAsset,
}: BlogAssetManagerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const imageAssets = useMemo(
    () => assets.filter((asset) => asset.file.type.startsWith("image/")),
    [assets],
  );

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;

    const nextAssets = Array.from(files).map((file) => {
      const filename = file.name.replace(/\s+/g, "-");
      return {
        filename,
        path: buildAssetPath(groupId, filename),
        previewUrl: URL.createObjectURL(file),
        file,
      };
    });

    onAddAssets(nextAssets);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-foreground">Media assets</div>
          <p className="text-xs text-muted-foreground">
            Upload local images or files for this post group. These are submitted with the publish PR.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{assets.length} local assets</Badge>
          <Button type="button" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Upload assets
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />

      {assets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          <ImagePlus className="mx-auto mb-2 h-5 w-5 text-primary" />
          No local assets added yet.
        </div>
      ) : (
        <div className="space-y-4">
          {imageAssets.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {imageAssets.map((asset) => (
                <div
                  key={asset.filename}
                  className="overflow-hidden rounded-xl border border-border bg-background"
                >
                  <img
                    src={asset.previewUrl}
                    alt={asset.filename}
                    className="h-28 w-full object-cover"
                  />
                  <div className="space-y-2 p-3">
                    <div className="truncate text-xs font-medium text-foreground">
                      {asset.filename}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">{asset.path}</div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => onRemoveAsset(asset.filename)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {assets.filter((asset) => !asset.file.type.startsWith("image/")).length > 0 ? (
            <div className="space-y-2">
              {assets
                .filter((asset) => !asset.file.type.startsWith("image/"))
                .map((asset) => (
                  <div
                    key={asset.filename}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Paperclip className="h-4 w-4 text-primary" />
                        <span className="truncate">{asset.filename}</span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{asset.path}</div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRemoveAsset(asset.filename)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
