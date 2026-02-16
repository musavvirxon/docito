import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import gsap from "gsap";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  MessageSquare,
  Shield,
  Sparkles,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Practices() {
  const { t, i18n } = useTranslation(["practicePage", "common"]);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  const [ready, setReady] = useState(i18n.hasLoadedNamespace("practicePage"));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try { await i18n.loadNamespaces(["practicePage"]); } catch {}
      if (!cancelled) setReady(true);
    };
    void load();
    return () => { cancelled = true; };
  }, [i18n, i18n.language]);

  useEffect(() => {
    if (titleRef.current) {
      gsap.fromTo(
        titleRef.current,
        { y: 50 },
        { y: 0, duration: 1, ease: "power3.out", delay: 0.3 },
      );
    }
    if (subtitleRef.current) {
      gsap.fromTo(
        subtitleRef.current,
        { y: 30 },
        { y: 0, duration: 1, ease: "power3.out", delay: 0.5 },
      );
    }
  }, []);

  if (!ready) return null;

  const automationFeatures = [
    {
      icon: Calendar,
      title: t("practicePage.automation.items.smartScheduling.title"),
      description: t("practicePage.automation.items.smartScheduling.description"),
    },
    {
      icon: MessageSquare,
      title: t("practicePage.automation.items.patientCommunications.title"),
      description: t("practicePage.automation.items.patientCommunications.description"),
    },
    {
      icon: FileText,
      title: t("practicePage.automation.items.documentation.title"),
      description: t("practicePage.automation.items.documentation.description"),
    },
    {
      icon: CreditCard,
      title: t("practicePage.automation.items.billingPayments.title"),
      description: t("practicePage.automation.items.billingPayments.description"),
    },
    {
      icon: BarChart3,
      title: t("practicePage.automation.items.analyticsReports.title"),
      description: t("practicePage.automation.items.analyticsReports.description"),
    },
    {
      icon: Users,
      title: t("practicePage.automation.items.staffManagement.title"),
      description: t("practicePage.automation.items.staffManagement.description"),
    },
  ];

  const benefitStats = [
    { value: t("practicePage.stats.lessAdminTime.value"), label: t("practicePage.stats.lessAdminTime.label") },
    { value: t("practicePage.stats.patientBooking.value"), label: t("practicePage.stats.patientBooking.label") },
    { value: t("practicePage.stats.fasterIntake.value"), label: t("practicePage.stats.fasterIntake.label") },
    { value: t("practicePage.stats.paperless.value"), label: t("practicePage.stats.paperless.label") },
  ];

  const allInOneFeatures = [
    t("practicePage.solution.bullets.onlineScheduling"),
    t("practicePage.solution.bullets.recordsManagement"),
    t("practicePage.solution.bullets.treatmentPlanning"),
    t("practicePage.solution.bullets.digitalPrescriptions"),
    t("practicePage.solution.bullets.insuranceVerification"),
    t("practicePage.solution.bullets.paymentProcessing"),
    t("practicePage.solution.bullets.videoConsultations"),
    t("practicePage.solution.bullets.labImagingOrders"),
    t("practicePage.solution.bullets.staffScheduling"),
    t("practicePage.solution.bullets.realTimeAnalytics"),
    t("practicePage.solution.bullets.secureMessaging"),
    t("practicePage.solution.bullets.referralManagement"),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
        {/* Animated background */}
        <div className="absolute inset-0">
          <motion.div
            animate={{
              background: [
                "radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.12) 0%, transparent 50%)",
                "radial-gradient(circle at 80% 70%, hsl(var(--primary) / 0.12) 0%, transparent 50%)",
                "radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.12) 0%, transparent 50%)",
                "radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.12) 0%, transparent 50%)",
              ],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left content */}
            <div className="space-y-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm text-primary text-sm font-medium rounded-full border border-primary/20">
                  <Bot className="w-4 h-4" />
                  {t("practicePage.hero.kicker")}
                </span>
              </motion.div>

              <h1
                ref={titleRef}
                className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight opacity-100"
              >
                <span className="block text-foreground">{t("practicePage.hero.headlineLine1")}</span>
                <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent font-normal">
                  {t("practicePage.hero.headlineLine2")}
                </span>
              </h1>

              <p
                ref={subtitleRef}
                className="text-lg sm:text-xl text-muted-foreground font-light leading-relaxed max-w-xl opacity-100"
              >
                {t("practicePage.hero.subheadline")}
              </p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    asChild
                    size="lg"
                    className="h-14 px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg gap-2 shadow-lg shadow-primary/25"
                  >
                    <Link to="/register-practice">
                      {t("practicePage.hero.primaryCta")}
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button asChild size="lg" variant="outline" className="h-14 px-8 rounded-full text-lg gap-2 border-2">
                    <Link to="/contact">{t("practicePage.hero.secondaryCta")}</Link>
                  </Button>
                </motion.div>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 }}
                className="grid grid-cols-4 gap-4 pt-8"
              >
                {benefitStats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl sm:text-3xl font-semibold text-primary">{stat.value}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right content - Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative"
            >
              <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/10 blur-3xl" />
              <div className="rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-sm text-muted-foreground">{t("practicePage.dashboard.title")}</div>
                    <div className="text-xl font-semibold">{t("practicePage.dashboard.headline")}</div>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <span className="w-3 h-3 rounded-full bg-primary/60" />
                    <span className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                  </div>
                </div>

                {/* Automation indicators */}
                <div className="space-y-3">
                  {[
                    { icon: Clock, text: t("practicePage.dashboard.items.appointments"), status: "active" },
                    { icon: MessageSquare, text: t("practicePage.dashboard.items.reminders"), status: "done" },
                    { icon: FileText, text: t("practicePage.dashboard.items.notes"), status: "active" },
                    { icon: CreditCard, text: t("practicePage.dashboard.items.invoices"), status: "done" },
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          item.status === "active" ? "bg-primary/20" : "bg-green-500/20"
                        }`}
                      >
                        <item.icon
                          className={`w-5 h-5 ${item.status === "active" ? "text-primary" : "text-green-500"}`}
                        />
                      </div>
                      <span className="text-sm text-foreground flex-1">{item.text}</span>
                      {item.status === "done" && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {item.status === "active" && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 text-primary" />
                    <div>
                      <div className="text-sm font-medium text-foreground">{t("practicePage.dashboard.timeSaved.label")}</div>
                      <div className="text-2xl font-bold text-primary">{t("practicePage.dashboard.timeSaved.value")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center"
          >
            <motion.div
              animate={{ y: [0, 12, 0], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-3 bg-muted-foreground/50 rounded-full mt-2"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Automation Features Section */}
      <section className="py-24 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Workflow className="w-4 h-4" />
              {t("practicePage.automation.title")}
            </span>
            <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">
              {t("practicePage.automation.headline").split(" ").slice(0, -1).join(" ")}{" "}
              <span className="font-normal text-primary">{t("practicePage.automation.headline").split(" ").pop()}</span>
            </h2>
            <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
              {t("practicePage.automation.subheadline")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {automationFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group"
              >
                <div className="h-full p-6 rounded-3xl bg-card border border-border/50 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
                  <div className="flex items-start gap-4">
                    <motion.div
                      whileHover={{ rotate: 5, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 group-hover:from-primary/30 group-hover:to-primary/10 transition-colors duration-300"
                    >
                      <feature.icon className="w-6 h-6 text-primary" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* All-in-One Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent-foreground text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4 text-primary" />
                {t("practicePage.solution.title")}
              </span>
              <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-6">
                {t("practicePage.solution.headlineLine1")}
                <br />
                <span className="font-normal text-primary">{t("practicePage.solution.headlineLine2")}</span>
              </h2>
              <p className="text-lg text-muted-foreground font-light mb-8 leading-relaxed">
                {t("practicePage.solution.subheadline")}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {allInOneFeatures.map((feature, index) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              {/* Visual representation of connected system */}
              <div className="relative aspect-square max-w-md mx-auto">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-8 border-2 border-dashed border-primary/20 rounded-full"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-16 border-2 border-dashed border-accent/20 rounded-full"
                />

                {/* Center hub */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl shadow-primary/30">
                  <Sparkles className="w-10 h-10 text-primary-foreground" />
                </div>

                {/* Orbiting icons */}
                {[Calendar, FileText, Users, CreditCard, MessageSquare, Shield].map((Icon, i) => {
                  const angle = (i * 60 * Math.PI) / 180;
                  const x = Math.cos(angle) * 140;
                  const y = Math.sin(angle) * 140;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                      className="absolute top-1/2 left-1/2 w-12 h-12 rounded-2xl bg-card border border-border/50 flex items-center justify-center shadow-lg"
                      style={{
                        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                      }}
                    >
                      <Icon className="w-5 h-5 text-primary" />
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              {t("practicePage.security.title")}
            </span>
            <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">
              {t("practicePage.security.headline").split(" ").slice(0, -1).join(" ")}{" "}
              <span className="font-normal text-primary">{t("practicePage.security.headline").split(" ").pop()}</span>
            </h2>
            <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
              {t("practicePage.security.subheadline")}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: t("practicePage.security.badges.hipaa.title"), sublabel: t("practicePage.security.badges.hipaa.description") },
              { label: t("practicePage.security.badges.encryption.title"), sublabel: t("practicePage.security.badges.encryption.description") },
              { label: t("practicePage.security.badges.uptime.title"), sublabel: t("practicePage.security.badges.uptime.description") },
              { label: t("practicePage.security.badges.soc2.title"), sublabel: t("practicePage.security.badges.soc2.description") },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center p-6 rounded-2xl bg-card border border-border/50"
              >
                <div className="text-lg font-semibold text-foreground">{item.label}</div>
                <div className="text-sm text-muted-foreground">{item.sublabel}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            animate={{
              background: [
                "radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%)",
                "radial-gradient(circle at 80% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%)",
                "radial-gradient(circle at 50% 20%, hsl(var(--primary) / 0.15) 0%, transparent 50%)",
                "radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%)",
              ],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, type: "spring" }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8"
            >
              <Sparkles className="w-4 h-4" />
              {t("practicePage.cta.kicker")}
            </motion.div>

            <h2 className="text-4xl md:text-6xl font-extralight tracking-tight text-foreground mb-6">
              {t("practicePage.cta.headlineLine1")}
              <br />
              <span className="font-normal text-primary">{t("practicePage.cta.headlineLine2")}</span>
            </h2>

            <p className="text-lg md:text-xl text-muted-foreground font-light max-w-2xl mx-auto mb-12">
              {t("practicePage.cta.subheadline")}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  asChild
                  size="lg"
                  className="h-14 px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg gap-2"
                >
                  <Link to="/register-practice">
                    <Calendar className="w-5 h-5" />
                    {t("practicePage.cta.primaryCta")}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button asChild size="lg" variant="outline" className="h-14 px-8 rounded-full text-lg gap-2 border-2">
                  <Link to="/contact">
                    <Users className="w-5 h-5" />
                    {t("practicePage.cta.secondaryCta")}
                  </Link>
                </Button>
              </motion.div>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 text-sm text-muted-foreground"
            >
              {t("practicePage.cta.badge")}
            </motion.p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
