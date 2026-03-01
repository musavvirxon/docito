import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface BlogDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string | null;
  isDeleting: boolean;
  onConfirm: () => void;
}

export default function BlogDeleteDialog({
  open,
  onOpenChange,
  groupId,
  isDeleting,
  onConfirm,
}: BlogDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete blog post group</AlertDialogTitle>
          <AlertDialogDescription>
            This action submits a delete request through the secure publish flow for{" "}
            <span className="font-medium text-foreground">{groupId || "this group"}</span>. The
            actual deletion remains reviewable through a pull request before merge.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isDeleting} onClick={onConfirm}>
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete group
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
