import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface BlogImageInsertValue {
  src: string;
  alt: string;
  caption: string;
  title: string;
}

interface BlogImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (value: BlogImageInsertValue) => void;
  assetOptions?: string[];
}

export default function BlogImageDialog({
  open,
  onOpenChange,
  onInsert,
  assetOptions = [],
}: BlogImageDialogProps) {
  const [src, setSrc] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!open) {
      setSrc("");
      setAlt("");
      setCaption("");
      setTitle("");
    }
  }, [open]);

  const canInsert = useMemo(() => src.trim().length > 0, [src]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert image</DialogTitle>
          <DialogDescription>
            Add an external image URL or use a local asset path from the asset manager.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blog-image-src">Image URL or asset path</Label>
            <Input
              id="blog-image-src"
              value={src}
              onChange={(event) => setSrc(event.target.value)}
              placeholder="https://... or /blog/group-id/image.webp"
            />
          </div>

          {assetOptions.length > 0 ? (
            <div className="space-y-2">
              <Label>Available local assets</Label>
              <div className="flex flex-wrap gap-2">
                {assetOptions.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSrc(option)}
                  >
                    {option.split("/").pop()}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="blog-image-alt">Alt text</Label>
            <Input
              id="blog-image-alt"
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
              placeholder="Describe the image"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="blog-image-caption">Caption</Label>
            <Input
              id="blog-image-caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Optional caption"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="blog-image-title">Title attribute</Label>
            <Input
              id="blog-image-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Optional title"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canInsert}
            onClick={() => {
              onInsert({
                src: src.trim(),
                alt: alt.trim(),
                caption: caption.trim(),
                title: title.trim(),
              });
              onOpenChange(false);
            }}
          >
            Insert image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
