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

export interface BlogEmbedInsertValue {
  src: string;
  caption: string;
  provider: string;
}

interface BlogEmbedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (value: BlogEmbedInsertValue) => void;
}

const detectProvider = (value: string) => {
  const lower = value.toLowerCase();
  if (lower.includes("youtube") || lower.includes("youtu.be")) return "youtube";
  if (lower.includes("vimeo")) return "vimeo";
  if (lower.includes("loom")) return "loom";
  if (lower.includes("drive.google")) return "google-drive";
  return "embed";
};

export default function BlogEmbedDialog({
  open,
  onOpenChange,
  onInsert,
}: BlogEmbedDialogProps) {
  const [src, setSrc] = useState("");
  const [caption, setCaption] = useState("");

  useEffect(() => {
    if (!open) {
      setSrc("");
      setCaption("");
    }
  }, [open]);

  const provider = useMemo(() => detectProvider(src.trim()), [src]);
  const canInsert = useMemo(() => src.trim().length > 0, [src]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert video or embed</DialogTitle>
          <DialogDescription>
            Insert YouTube, Vimeo, Loom, or any trusted iframe-compatible embed URL.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blog-embed-src">Embed URL</Label>
            <Input
              id="blog-embed-src"
              value={src}
              onChange={(event) => setSrc(event.target.value)}
              placeholder="https://www.youtube.com/embed/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="blog-embed-caption">Caption</Label>
            <Input
              id="blog-embed-caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Optional caption"
            />
          </div>

          <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
            Detected provider: <span className="font-medium text-foreground">{provider}</span>
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
                caption: caption.trim(),
                provider,
              });
              onOpenChange(false);
            }}
          >
            Insert embed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
