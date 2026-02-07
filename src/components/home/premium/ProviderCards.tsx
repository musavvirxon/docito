// src/components/home/premium/ProviderCards.tsx
import { motion } from "framer-motion";
import {
  Building2,
  Stethoscope,
  FlaskConical,
  Pill,
  Activity,
  Users,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { trackMarketingEvent } from "@/lib/marketing";

const providerTypes = [
  {
    icon: Stethoscope,
    title: "Doctors",
    description: "Find the right clinician and keep visits, notes, and follow-ups in one place.",
    route: "/doctors",
    joinRole: "doctor",
    joinLabel: "Join as a doctor",
  },
  {
    icon: Building2,
    title: "Clinics",
    description: "Run scheduling, documentation, billing, and team workflows from a single workspace.",
    route: "/find-practices",
    joinRole: "admin",
    joinLabel: "Join as a clinic",
  },
  {
    icon: FlaskConical,
    title: "Labs",
    description: "Connect orders and results directly to the patient record — no manual handoffs.",
    route: "/labs",
    joinRole: "lab_admin",
    joinLabel: "Join as a lab",
  },
  {
    icon: Activity,
    title: "Imaging",
    description: "Keep imaging reports and status updates visible across the care team.",
    route: "/imaging",
    joinRole: "imaging_admin",
    joinLabel: "Join as imaging",
  },
  {
    icon: Pill,
    title: "Pharmacies",
    description: "Prescriptions, refills, and medication updates — connected to care.",
    route: "/pharmacies",
    joinRole: "pharmacy_admin",
    joinLabel: "Join as a pharmacy",
  },
  {
    icon: Users,
    title: "Patients",
    description: "Book care, manage records, and stay on top of your health — in one app.",
    route: "/doctors",
    joinRole: "patient",
    joinLabel: "Create patient account",
  },
];

export default function ProviderCards() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const onBrowse = (title: string, route: string) => {
    void trackMarketingEvent("home_network_browse", { title, route });
    navigate(route);
  };

  const onJoin = (title: string, role: string) => {
    void trackMarketingEvent("home_network_join", { title, role });
    navigate(`/auth?mode=signup&role=${encodeURIComponent(role)}`);
  };

  return (
    <section className="py-24 bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {t("home:premium.providers.badge", "One connected network")}
            </span>
          </div>

          <h2 className="text-4xl font-bold mb-6">
            {t("home:premium.providers.title", "Patients and providers")}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
              {" "}
              in sync
            </span>
          </h2>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t(
              "home:premium.providers.description",
              "Browse care as a patient — or bring your organization onto Docito to unify scheduling, records, billing, and follow-ups."
            )}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {providerTypes.map((provider, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="group"
            >
              <div className="h-full bg-white/50 border border-primary/10 rounded-3xl p-8 backdrop-blur-sm hover:bg-white/70 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="w-16 h-16 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <provider.icon className="h-8 w-8 text-primary" />
                </div>

                <h3 className="text-2xl font-bold mb-4">{provider.title}</h3>
                <p className="text-muted-foreground mb-8">{provider.description}</p>

                <div className="mt-auto flex flex-col gap-3">
                  <Button
                    variant="outline"
                    className="w-full group/btn"
                    onClick={() => onBrowse(provider.title, provider.route)}
                  >
                    {t("home:premium.providers.browseButton", "Browse")}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>

                  {provider.joinRole && (
                    <Button
                      className="w-full group/btn"
                      onClick={() => onJoin(provider.title, provider.joinRole)}
                    >
                      {provider.joinLabel ?? t("home:premium.providers.joinButton", "Join")}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
