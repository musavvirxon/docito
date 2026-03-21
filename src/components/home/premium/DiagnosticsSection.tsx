// src/components/home/premium/DiagnosticsSection.tsx
import { motion } from "framer-motion";
import {
  Microscope,
  Scan,
  Pill,
  ArrowRight,
  CheckCircle,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { trackMarketingEvent } from "@/lib/marketing";
import { useTranslation } from "react-i18next";

const diagnosticServices = [
  {
    icon: Microscope,
    key: "lab",
    browseRoute: "/labs",
    joinRole: "lab_admin",
  },
  {
    icon: Scan,
    key: "imaging",
    browseRoute: "/imaging",
    joinRole: "imaging_admin",
  },
  {
    icon: Pill,
    key: "pharmacy",
    browseRoute: "/pharmacies",
    joinRole: "pharmacy_admin",
  },
];

export default function DiagnosticsSection() {
  const { t } = useTranslation("premium");
  const navigate = useNavigate();

  const onBrowse = (serviceTitle: string, route: string) => {
    void trackMarketingEvent("home_diagnostics_browse", {
      service: serviceTitle,
      route,
    });
    navigate(route);
  };

  const onJoin = (serviceTitle: string, role: string) => {
    void trackMarketingEvent("home_diagnostics_join", {
      service: serviceTitle,
      role,
    });
    navigate(`/auth?mode=signup&role=${encodeURIComponent(role)}`);
  };

  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {t("diagnostics.badge", { defaultValue: "Diagnostics & Pharmacy" })}
            </span>
          </div>

          <h2 className="text-4xl font-bold mb-6">
            {t("diagnostics.title.prefix", { defaultValue: "Keep the full care journey" })}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              {t("diagnostics.title.highlight", { defaultValue: "connected" })}
            </span>
          </h2>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t("diagnostics.description", {
              defaultValue:
                "Bring labs, imaging, and pharmacy updates into the same workflow as scheduling and visits — so patients and teams always have the latest context.",
            })}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {diagnosticServices.map((service, index) => {
            const serviceTitle = t(`diagnostics.services.${service.key}.title`, { defaultValue: service.key });
            const serviceDescription = t(`diagnostics.services.${service.key}.description`, { defaultValue: "" });
            const serviceFeatures = t(`diagnostics.services.${service.key}.features`, { returnObjects: true, defaultValue: [] }) as string[];
            const browseLabel = t(`diagnostics.services.${service.key}.browse`, { defaultValue: "Browse" });
            const joinLabel = t(`diagnostics.services.${service.key}.join`, { defaultValue: "Join" });

            return (
            <motion.div
              key={service.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="group"
            >
              <div className="h-full bg-background/50 border border-border/40 rounded-3xl p-8 backdrop-blur-sm hover:bg-background/70 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col">
                <div className="w-16 h-16 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <service.icon className="h-8 w-8 text-primary" />
                </div>

                <h3 className="text-2xl font-bold mb-4">{serviceTitle}</h3>
                <p className="text-muted-foreground mb-6 min-h-[72px]">{serviceDescription}</p>

                <div className="space-y-3 mb-8 min-h-[108px]">
                  {serviceFeatures.map((feature, featureIndex) => (
                    <div
                      key={featureIndex}
                      className="flex items-center gap-3 text-sm"
                    >
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto flex flex-col gap-3">
                  <Button
                    variant="outline"
                    className="w-full group/btn"
                    onClick={() => onBrowse(serviceTitle, service.browseRoute)}
                  >
                    {browseLabel}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>

                  <Button
                    className="w-full group/btn"
                    onClick={() => onJoin(serviceTitle, service.joinRole)}
                  >
                    {joinLabel}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </div>
              </div>
            </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
