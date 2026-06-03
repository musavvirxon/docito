import { useEffect, useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AppointmentReview } from "@/hooks/useAppointmentReviews";

interface Props {
  review: AppointmentReview;
  onSubmit: (reply: string) => Promise<any>;
}

/**
 * Inline composer letting a doctor post or update their public reply to a review.
 */
export function DoctorReplyBox({ review, onSubmit }: Props) {
  const [reply, setReply] = useState(review.doctor_reply || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setReply(review.doctor_reply || "");
  }, [review.id]);

  const handle = async () => {
    setSaving(true);
    await onSubmit(reply);
    setSaving(false);
  };

  return (
    <div className="space-y-2 pt-2 border-t">
      <p className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
        <MessageSquare className="h-3 w-3" />
        {review.doctor_reply ? "Edit your reply" : "Reply to this review"}
      </p>
      <Textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="Thank you for your feedback…"
        rows={2}
        maxLength={1000}
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={handle} disabled={saving}>
          {saving && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
          {review.doctor_reply ? "Update reply" : "Post reply"}
        </Button>
      </div>
    </div>
  );
}

export default DoctorReplyBox;
