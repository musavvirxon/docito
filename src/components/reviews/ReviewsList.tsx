import { format } from "date-fns";
import { Star, MessageSquare, Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AppointmentReview } from "@/hooks/useAppointmentReviews";

interface ReviewsListProps {
  reviews: AppointmentReview[];
  loading?: boolean;
  emptyHint?: string;
}

function Stars({ rating, size = 4 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            `h-${size} w-${size}`,
            n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

export function ReviewsList({ reviews, loading, emptyHint }: ReviewsListProps) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading reviews…</p>;
  }
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {emptyHint || "No reviews yet."}
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {reviews.map((r) => {
        const initials =
          r.patient_profile?.full_name
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "P";
        return (
          <Card key={r.id} className="border-border/60">
            <CardContent className="pt-4 pb-4 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={r.patient_profile?.avatar_url || ""} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {r.patient_profile?.full_name || "Patient"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!r.is_public && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Lock className="h-3 w-3" /> Private
                    </Badge>
                  )}
                  <Stars rating={r.rating} />
                </div>
              </div>

              {r.comment && (
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{r.comment}</p>
              )}

              {r.doctor_reply && (
                <div className="mt-2 pl-3 border-l-2 border-primary/40 bg-primary/5 rounded-r-md p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                    <MessageSquare className="h-3 w-3" /> Doctor's reply
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{r.doctor_reply}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default ReviewsList;
