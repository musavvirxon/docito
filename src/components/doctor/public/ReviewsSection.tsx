import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointmentReviews } from "@/hooks/useAppointmentReviews";
import { ReviewsList } from "@/components/reviews/ReviewsList";
import { LeaveReviewForm } from "@/components/reviews/LeaveReviewForm";
import { Card, CardContent } from "@/components/ui/card";

interface ReviewsSectionProps {
  averageRating: number | null;
  numReviews: number | null;
  doctorId?: string | null; // doctors.id
}

/**
 * Public reviews on the doctor profile.
 * - Anyone can see public reviews + averages.
 * - Signed-in patients with at least one completed appointment with this doctor
 *   can leave (or edit) their review for the most recent completed appointment.
 */
export default function ReviewsSection({ averageRating, numReviews, doctorId }: ReviewsSectionProps) {
  const { t, i18n } = useTranslation("doctors");
  const { user } = useAuth();
  const isRTL = i18n.language === "ar";

  const { reviews, loading, refresh } = useAppointmentReviews({
    doctorId: doctorId || null,
    publicOnly: true,
  });

  const [eligibleAppt, setEligibleAppt] = useState<{ id: string } | null>(null);
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);

  // Find the patient's most recent completed appointment with this doctor (if any).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id || !doctorId) {
        setEligibleAppt(null);
        setExistingReviewId(null);
        return;
      }
      try {
        const { data } = await supabase
          .from("appointments")
          .select("id")
          .eq("doctor_id", doctorId)
          .eq("patient_id", user.id)
          .eq("status", "completed")
          .order("appointment_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (data) {
          setEligibleAppt({ id: data.id });
          const { data: existing } = await supabase
            .from("appointment_reviews")
            .select("id")
            .eq("appointment_id", data.id)
            .eq("patient_id", user.id)
            .maybeSingle();
          setExistingReviewId(existing?.id || null);
        } else {
          setEligibleAppt(null);
          setExistingReviewId(null);
        }
      } catch {
        setEligibleAppt(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, doctorId]);

  const patientsExistingReview = existingReviewId
    ? reviews.find((r) => r.id === existingReviewId) || null
    : null;

  const hasAggregate = (numReviews ?? 0) > 0 || reviews.length > 0;
  const displayAverage = averageRating ?? 0;
  const displayCount = numReviews ?? reviews.length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={cn("py-12 lg:py-16", isRTL && "rtl")}
    >
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Star className="w-6 h-6 text-primary" />
          {t("profile.patientReviews", "Patient Reviews")}
        </h2>

        {/* Aggregate */}
        {hasAggregate ? (
          <Card>
            <CardContent className="py-6 text-center">
              <div className="text-5xl font-bold text-primary mb-2">
                {displayAverage.toFixed(1)}
              </div>
              <div className="flex justify-center gap-1 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-5 h-5",
                      i < Math.floor(displayAverage)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30",
                    )}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("profile.basedOn", { count: displayCount })}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-10 text-center">
              <Star className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="font-medium text-foreground mb-1">
                {t("profile.noReviewsYet", "No reviews yet")}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {t(
                  "publicProfile.reviews.emptyState",
                  "Reviews appear after verified visits. Be the first to book and leave a review!",
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Leave / edit review */}
        {user && eligibleAppt && doctorId && (
          <LeaveReviewForm
            appointmentId={eligibleAppt.id}
            doctorId={doctorId}
            existingReview={patientsExistingReview}
            onSubmitted={refresh}
          />
        )}

        {/* List */}
        <ReviewsList
          reviews={reviews}
          loading={loading}
          emptyHint={t("publicProfile.reviews.empty", "Be the first to leave a review.")}
        />
      </div>
    </motion.section>
  );
}
