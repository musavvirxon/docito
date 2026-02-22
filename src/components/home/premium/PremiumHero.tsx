// File: src/components/home/premium/PremiumHero.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Building2,
  FlaskConical,
  Pill,
  ScanLine,
  Stethoscope,
  Users,
} from "lucide-react";

import LazyHeroOrb3D from "./LazyHeroOrb3D";
import { trackMarketingEvent } from "@/lib/marketing";
import { useLocalizedPath } from "@/hooks/useLocalizedPath";

type EcosystemChip = {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

function scrollToId(id: string) {
  try {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    }
  } catch {
    // no-op
  }
  return false;
}

export default function PremiumHero() {
  const navigate = useNavigate();
  const { t } = useTranslation("premium");
  const { getLocalizedPath } = useLocalizedPath();
  const [isVisible, setIsVisible] = useState(false);

  const ecosystem = useMemo<EcosystemChip[]>(
    () => [
      { label: t("hero.ecosystem.doctors", "Doctors"), Icon: Stethoscope },
      { label: t("hero.ecosystem.clinics", "Clinics"), Icon: Building2 },
      { label: t("hero.ecosystem.labs", "Labs"), Icon: FlaskConical },
      { label: t("hero.ecosystem.imaging", "Imaging"), Icon: ScanLine },
      { label: t("hero.ecosystem.pharmacies", "Pharmacies"), Icon: Pill },
      { label: t("hero.ecosystem.patients", "Patients"), Icon: Users },
    ],
    [t],
  );

  // Trigger CSS animations after mount
  useEffect(() => {
    const timer = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  const startTrial = () => {
    void trackMarketingEvent("home_hero_primary_click", {
      cta: "start_trial",
      section: "hero",
    });
    navigate(`${getLocalizedPath("/auth")}?mode=signup`);
  };

  const findCare = () => {
    void trackMarketingEvent("home_hero_secondary_click", {
      cta: "find_care",
      section: "hero",
    });
    if (!scrollToId("search")) {
      navigate(`${getLocalizedPath("/") }#search`);
    }
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-visible pt-4">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center">
        {/* Left side - Text content */}
        <div className="relative z-10 w-full lg:w-1/2 py-8 lg:py-10 lg:pr-8">
          <div className="text-left space-y-8">
            {/* Badge */}
            <div
              className={`transform transition-all duration-500 ease-out ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
              }`}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm text-primary text-sm font-medium rounded-full border border-primary/20">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                {t("hero.badge", "All your care, in sync")}
              </span>
            </div>

            {/* Title (keep unanimated for LCP) */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-foreground">
              <span className="block">{t("hero.title.line1", "Less admin. More care.")}</span>
              <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent font-normal">
                {t("hero.title.line2", "One platform for every step of healthcare.")}
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl font-light leading-relaxed">
              {t(
                "hero.description",
                "Docito connects patients, providers, labs, imaging, pharmacies, and insurance—so bookings, records, prescriptions, results, and payments stay in one place.",
              )}
            </p>

            {/* Audience Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl">
              <div className="p-4 rounded-2xl bg-background/50 backdrop-blur-xl border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Stethoscope className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {t("hero.cards.doctors.title", "For doctors")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "hero.cards.doctors.description",
                    "Appointments, payments, follow-ups, telemedicine—connected end-to-end",
                  )}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-background/50 backdrop-blur-xl border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {t("hero.cards.patients.title", "For patients")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("hero.cards.patients.description", "Find, book, and track care in one place")}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-background/50 backdrop-blur-xl border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {t("hero.cards.clinics.title", "For clinics")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("hero.cards.clinics.description", "Scheduling, records, and billing unified")}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-background/50 backdrop-blur-xl border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <ScanLine className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {t("hero.cards.imaging.title", "For imaging")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("hero.cards.imaging.description", "Orders, reports, and referral coordination")}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-background/50 backdrop-blur-xl border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {t("hero.cards.pharmacy.title", "For pharmacy")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("hero.cards.pharmacy.description", "ePrescriptions, fulfillment, and delivery")}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-background/50 backdrop-blur-xl border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <FlaskConical className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {t("hero.cards.labs.title", "For labs")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("hero.cards.labs.description", "Test ordering, results, and digital delivery")}
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div
              className={`flex flex-col sm:flex-row gap-4 transform transition-all duration-500 ease-out delay-300 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
              }`}
            >
              <button
                onClick={startTrial}
                className="px-8 py-4 bg-primary text-primary-foreground font-medium rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2"
              >
                {t("hero.cta.primary", "Start free 14-day trial")}
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={findCare}
                className="px-8 py-4 bg-background/80 backdrop-blur-sm text-foreground font-medium rounded-full border border-border/50 hover:bg-background/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {t("hero.cta.secondary", "Find care now")}
              </button>
            </div>

            <div className="text-sm text-muted-foreground">
              {t("hero.cta.note", "No demo. No credit card to start. Cancel anytime.")}
            </div>

            {/* Mobile-only ecosystem chips (replaces 3D orb on small screens) */}
            <div className="md:hidden pt-2">
              <div className="grid grid-cols-3 gap-2 max-w-sm">
                {ecosystem.map(({ label, Icon }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-muted/30 border border-border/40"
                  >
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right side - 3D Globe (desktop/tablet only) */}
        <div className="hidden md:block w-full lg:w-1/2 h-[520px] lg:h-[720px] relative -mt-8">
          <LazyHeroOrb3D />
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-10 transition-opacity duration-500 delay-[1500ms] ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            void trackMarketingEvent("home_scroll_indicator_click", {
              section: "hero",
              target: "search",
            });
            scrollToId("search");
          }}
          aria-label={t("hero.a11y.scrollToSearch", "Scroll to search")}
          className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center animate-bounce bg-transparent"
        >
          <div className="w-1.5 h-3 bg-muted-foreground/50 rounded-full mt-2" />
        </button>
      </div>
    </section>
  );
}
