import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, Copy } from "lucide-react";

interface BlogJsonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  json: string;
  copied: boolean;
  onCopy: () => void;
}

export default function BlogJsonDialog({
  open,
  onOpenChange,
  json,
  copied,
  onCopy,
}: BlogJsonDialogProps) {
  const prettyLength = useMemo(() => `${json.length.toLocaleString()} chars`, [json.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Blog JSON export</DialogTitle>
          <DialogDescription>
            Copy this payload for review, backup, or manual repository comparison. Character count:{" "}
            {prettyLength}.
          </DialogDescription>
        </DialogHeader>

        <Textarea value={json} readOnly className="min-h-[520px] font-mono text-xs" />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onCopy}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Copied" : "Copy JSON"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
