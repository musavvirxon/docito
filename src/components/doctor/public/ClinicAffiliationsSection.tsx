import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Building2, MapPin, Phone, BadgeCheck, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Practice {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  verified: boolean | null;
}

interface ClinicAffiliationsSectionProps {
  practice: Practice | null;
}

export default function ClinicAffiliationsSection({ practice }: ClinicAffiliationsSectionProps) {
  const { t, i18n } = useTranslation(["doctors", "common"]);
  const navigate = useNavigate();
  const isRTL = i18n.language === "ar";

  if (!practice) return null;

  const location = [practice.city, practice.country].filter(Boolean).join(", ");

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={cn("py-12 lg:py-16 bg-muted/20", isRTL && "rtl")}
    >
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary" />
          {t("profile.clinicAffiliation", "Clinic Affiliation")}
        </h2>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="bg-card rounded-2xl border border-border p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                {practice.name}
                {practice.verified && (
                  <BadgeCheck className="w-4 h-4 text-blue-500" />
                )}
              </h3>
              {location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {location}
                </p>
              )}
              {practice.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Phone className="w-3.5 h-3.5" />
                  {practice.phone}
                </p>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate(`/clinic/${practice.id}`)}
            className="group"
          >
            {t("actions.viewClinic", "View Clinic")}
            <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </motion.div>
      </div>
    </motion.section>
  );
}
