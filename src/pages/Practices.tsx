// File: src/pages/Practices.tsx

import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, CalendarCheck, DollarSign, ShieldCheck, Sparkles, Users, Workflow } from "lucide-react";
import PracticesIllustration from "@/components/illustrations/PracticesIllustration";

export default function Practices() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-24 right-[-120px] h-[420px] w-[420px] rounded-full bg-accent/20 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-14 md:py-20">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="px-3 py-1">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t("practices.badge", "Modern practice suite")}
                </Badge>
              </div>

              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                {t("practices.title", "Run your clinic with clarity")}
              </h1>

              <p className="text-lg text-muted-foreground max-w-xl">
                {t(
                  "practices.subtitle",
                  "Appointments, staff workflow, billing activity, and analytics—wired to your Supabase data (no mock dashboards).",
                )}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="gap-2">
                  <Link to="/auth">
                    {t("practices.get_started", "Get started")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/contact">{t("practices.talk_to_sales", "Talk to us")}</Link>
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <Card className="border-border/60">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">{t("practices.stat_1_label", "Setup")}</div>
                    <div className="text-xl font-bold">{t("practices.stat_1_value", "Minutes")}</div>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">{t("practices.stat_2_label", "Data")}</div>
                    <div className="text-xl font-bold">{t("practices.stat_2_value", "Realtime")}</div>
                  </CardContent>
                </Card>
                <Card className="border-border/60 sm:col-span-1 col-span-2">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">{t("practices.stat_3_label", "Security")}</div>
                    <div className="text-xl font-bold">{t("practices.stat_3_value", "RLS + Auth")}</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-b from-primary/10 to-transparent blur-2xl" />
              <div className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur p-6 shadow-sm">
                <PracticesIllustration />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold">{t("practices.features_title", "Everything in one flow")}</h2>
            <p className="text-muted-foreground max-w-2xl">
              {t(
                "practices.features_subtitle",
                "Designed to feel calm and fast: the essentials on one screen, and deep details a click away.",
              )}
            </p>
          </div>
          <Button asChild variant="ghost" className="gap-2">
            <Link to="/auth">
              {t("practices.features_cta", "Open dashboard")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                {t("practices.feature_1_title", "Scheduling")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("practices.feature_1_desc", "Daily schedule, upcoming appointments, and quick status updates.")}
              </p>
            </CardHeader>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t("practices.feature_2_title", "Patients")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("practices.feature_2_desc", "Patient list, recent visits, and fast access to key details.")}
              </p>
            </CardHeader>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-primary" />
                {t("practices.feature_3_title", "Staff workflow")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("practices.feature_3_desc", "Role-based access, invites, and a clean staff experience.")}
              </p>
            </CardHeader>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                {t("practices.feature_4_title", "Analytics")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("practices.feature_4_desc", "Revenue, appointments, and patient metrics driven by your database.")}
              </p>
            </CardHeader>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                {t("practices.feature_5_title", "Billing")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("practices.feature_5_desc", "Transactions and collections pulled from billing tables—no hardcoded rows.")}
              </p>
            </CardHeader>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {t("practices.feature_6_title", "Secure by default")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("practices.feature_6_desc", "Supabase Auth + RLS for data, plus Edge Functions for guarded reads.")}
              </p>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-16">
        <div className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur p-8 md:p-10 overflow-hidden relative">
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-[-120px] top-[-120px] h-[260px] w-[260px] rounded-full bg-primary/10 blur-2xl" />
            <div className="absolute right-[-140px] bottom-[-140px] h-[320px] w-[320px] rounded-full bg-accent/25 blur-2xl" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">{t("practices.cta_title", "Ready to switch from spreadsheets?")}</h3>
              <p className="text-muted-foreground max-w-2xl">
                {t(
                  "practices.cta_desc",
                  "Create an account, connect your clinic, and start seeing real billing + analytics instantly.",
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/auth">
                  {t("practices.cta_primary", "Start now")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/contact">{t("practices.cta_secondary", "Contact")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
