import { useState, useEffect } from "react";
import { Star, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAppointmentReviews, type AppointmentReview } from "@/hooks/useAppointmentReviews";

interface LeaveReviewFormProps {
  appointmentId: string;
  doctorId: string;
  existingReview?: AppointmentReview | null;
  onSubmitted?: () => void;
  compact?: boolean;
}

/**
 * Patient-facing form to leave (or edit) a review for a completed appointment.
 */
export function LeaveReviewForm({
  appointmentId,
  doctorId,
  existingReview = null,
  onSubmitted,
  compact = false,
}: LeaveReviewFormProps) {
  const { submitReview, deleteReview } = useAppointmentReviews({ appointmentId });
  const [rating, setRating] = useState<number>(existingReview?.rating || 0);
  const [hovered, setHovered] = useState<number>(0);
  const [comment, setComment] = useState<string>(existingReview?.comment || "");
  const [isPublic, setIsPublic] = useState<boolean>(existingReview?.is_public ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setRating(existingReview?.rating || 0);
    setComment(existingReview?.comment || "");
    setIsPublic(existingReview?.is_public ?? true);
  }, [existingReview?.id]);

  const handleSubmit = async () => {
    if (rating < 1) return;
    setSubmitting(true);
    const { error } = await submitReview({
      appointmentId,
      doctorId,
      rating,
      comment,
      isPublic,
      existingId: existingReview?.id || null,
    });
    setSubmitting(false);
    if (!error) onSubmitted?.();
  };

  const handleDelete = async () => {
    if (!existingReview?.id) return;
    setDeleting(true);
    const { error } = await deleteReview(existingReview.id);
    setDeleting(false);
    if (!error) onSubmitted?.();
  };

  const body = (
    <div className="space-y-4">
      <div>
        <Label className="text-sm">Your rating</Label>
        <div className="flex items-center gap-1 mt-1.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hovered || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(n)}
                className="p-1 rounded transition-transform hover:scale-110"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
              >
                <Star
                  className={cn(
                    "h-6 w-6",
                    active ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40",
                  )}
                />
              </button>
            );
          })}
          {rating > 0 && (
            <span className="ml-2 text-sm text-muted-foreground">{rating} / 5</span>
          )}
        </div>
      </div>

      <div>
        <Label className="text-sm" htmlFor="review-comment">
          Comment (optional)
        </Label>
        <Textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this doctor…"
          rows={3}
          maxLength={2000}
          className="mt-1.5"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch id="review-public" checked={isPublic} onCheckedChange={setIsPublic} />
          <Label htmlFor="review-public" className="text-sm cursor-pointer">
            Show publicly on the doctor's profile
          </Label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {existingReview?.id && (
          <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting} className="text-destructive">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            <span className="ml-1.5">Delete</span>
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={submitting || rating < 1}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {existingReview?.id ? "Update review" : "Submit review"}
        </Button>
      </div>
    </div>
  );

  if (compact) return body;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-500" />
          {existingReview?.id ? "Edit your review" : "Leave a review"}
        </CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

export default LeaveReviewForm;
