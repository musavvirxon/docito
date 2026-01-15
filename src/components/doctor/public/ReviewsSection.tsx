import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewsSectionProps {
  averageRating: number | null;
  numReviews: number | null;
}

export default function ReviewsSection({ averageRating, numReviews }: ReviewsSectionProps) {
  const { t, i18n } = useTranslation("doctors");
  const isRTL = i18n.language === "ar";
  const hasReviews = numReviews && numReviews > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={cn("py-12 lg:py-16", isRTL && "rtl")}
    >
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Star className="w-6 h-6 text-primary" />
          {t("profile.patientReviews", "Patient Reviews")}
        </h2>

        {hasReviews ? (
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <div className="text-5xl font-bold text-primary mb-3">
              {averageRating?.toFixed(1)}
            </div>
            <div className="flex justify-center gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "w-6 h-6",
                    i < Math.floor(averageRating || 0)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30"
                  )}
                />
              ))}
            </div>
            <p className="text-muted-foreground">
              {t("profile.basedOn", { count: numReviews })}
            </p>
          </div>
        ) : (
          <div className="bg-muted/30 rounded-2xl border border-dashed border-border p-12 text-center">
            <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="font-medium text-foreground mb-2">
              {t("profile.noReviewsYet", "No reviews yet")}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {t("publicProfile.reviews.emptyState", "Reviews appear after verified visits. Be the first to book and leave a review!")}
            </p>
          </div>
        )}
      </div>
    </motion.section>
  );
}
