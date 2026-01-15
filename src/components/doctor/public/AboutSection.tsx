import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { GraduationCap, ChevronDown, ChevronUp, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AboutSectionProps {
  bio: string;
  yearsExperience: number | null;
  services: Array<{ id: string; name: string; category?: string }>;
  consultationTypes: string[] | null;
}

export default function AboutSection({
  bio,
  yearsExperience,
  services,
  consultationTypes,
}: AboutSectionProps) {
  const { t, i18n } = useTranslation("doctors");
  const isRTL = i18n.language === "ar";
  const [expanded, setExpanded] = useState(false);

  const shouldTruncate = bio.length > 300;
  const displayBio = shouldTruncate && !expanded ? bio.slice(0, 300) + "..." : bio;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={cn("py-12 lg:py-16", isRTL && "rtl")}
    >
      <div className="max-w-4xl mx-auto px-4">
        {/* About */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            {t("profile.about")}
          </h2>
          <div className="bg-card rounded-2xl border border-border p-6">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {displayBio || t("profile.noBio")}
            </p>
            {shouldTruncate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="mt-3 text-primary hover:text-primary/80"
              >
                {expanded ? (
                  <>
                    {t("common:actions.showLess", "Show less")}
                    <ChevronUp className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    {t("common:actions.readMore", "Read more")}
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            )}

            {/* Experience */}
            {yearsExperience && (
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">{yearsExperience}</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {t("profile.yearsExperience")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("publicProfile.about.experienceDescription", "Dedicated healthcare professional")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Services / Conditions */}
        {services.length > 0 && (
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-primary" />
              {t("profile.services")}
            </h2>
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex flex-wrap gap-2">
                {services.map((service) => (
                  <Badge
                    key={service.id}
                    variant="secondary"
                    className="px-3 py-1.5 text-sm"
                  >
                    {service.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Appointment Types */}
        {consultationTypes && consultationTypes.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">
              {t("profile.availableTypes")}
            </h3>
            <div className="flex flex-wrap gap-3">
              {consultationTypes.map((type) => (
                <div
                  key={type}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {type === "video" && (
                      <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                    {type === "in_person" && (
                      <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    )}
                    {type === "home_visit" && (
                      <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground capitalize">
                    {type.split("_").join(" ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
