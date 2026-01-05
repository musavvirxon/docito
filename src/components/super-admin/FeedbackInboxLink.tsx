import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bug, Inbox } from "lucide-react";

type Props = {
  onClick: () => void;
  count?: number;
  className?: string;
};

export default function FeedbackInboxLink({ onClick, count = 0, className }: Props) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className={className}
    >
      <Inbox className="h-4 w-4 mr-2" />
      Feedback
      {count > 0 ? (
        <Badge variant="secondary" className="ml-2">
          {count}
        </Badge>
      ) : (
        <Bug className="h-4 w-4 ml-2 opacity-60" />
      )}
    </Button>
  );
}
