// File: src/pages/Practices.tsx

import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, CalendarCheck, DollarSign, ShieldCheck, Sparkles, Users, Workflow } from "lucide-react";
import ModernNavbar from "@/components/home/ModernNavbar";
import ModernFooter from "@/components/home/ModernFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Practices() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModernNavbar />

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
                  Modern practice suite
                </Badge>
              </div>

              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                Run your clinic with clarity
              </h1>

              <p className="text-lg text-muted-foreground max-w-xl">
                Appointments, staff workflow, billing activity, and analytics—wired to your Supabase data (no mock
                dashboards).
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="gap-2">
                  <Link to="/auth">
                    Get started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/contact">Talk to us</Link>
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <Card className="border-border/60">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Setup</div>
                    <div className="text-xl font-bold">Minutes</div>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Data</div>
                    <div className="text-xl font-bold">Realtime</div>
                  </CardContent>
                </Card>
                <Card className="border-border/60 sm:col-span-1 col-span-2">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Security</div>
                    <div className="text-xl font-bold">RLS + Auth</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Illustration (inline, no external imports) */}
            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-b from-primary/10 to-transparent blur-2xl" />
              <div className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur p-6 shadow-sm">
                <div className="rounded-2xl border border-border/60 bg-background/40 p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Clinic dashboard</div>
                      <div className="text-xl font-bold">Live metrics</div>
                    </div>
                    <div className="flex gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-primary/60" />
                      <span className="h-2.5 w-2.5 rounded-full bg-accent/60" />
                      <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
                      <div className="text-xs text-muted-foreground">Revenue</div>
                      <div className="mt-1 text-lg font-bold">$12.4k</div>
                      <div className="mt-3 h-1.5 w-full rounded-full bg-muted">
                        <div className="h-1.5 w-2/3 rounded-full bg-primary/60" />
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
                      <div className="text-xs text-muted-foreground">Appointments</div>
                      <div className="mt-1 text-lg font-bold">214</div>
                      <div className="mt-3 h-1.5 w-full rounded-full bg-muted">
                        <div className="h-1.5 w-1/2 rounded-full bg-accent/60" />
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
                      <div className="text-xs text-muted-foreground">Patients</div>
                      <div className="mt-1 text-lg font-bold">89</div>
                      <div className="mt-3 h-1.5 w-full rounded-full bg-muted">
                        <div className="h-1.5 w-3/5 rounded-full bg-muted-foreground/40" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-border/60 bg-card/40 p-4">
                    <div className="text-xs text-muted-foreground">Today</div>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                        <div className="text-sm font-medium">10:30 • Check-in</div>
                        <div className="text-xs text-muted-foreground">Room 2</div>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                        <div className="text-sm font-medium">12:00 • Follow-up</div>
                        <div className="text-xs text-muted-foreground">Room 1</div>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                        <div className="text-sm font-medium">15:15 • New patient</div>
                        <div className="text-xs text-muted-foreground">Room 3</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 text-xs text-muted-foreground">
                    This is a visual preview only — your real Billing/Analytics pages pull from Supabase.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold">Everything in one flow</h2>
            <p className="text-muted-foreground max-w-2xl">
              Designed to feel calm and fast: the essentials on one screen, and deep details a click away.
            </p>
          </div>
          <Button asChild variant="ghost" className="gap-2">
            <Link to="/auth">
              Open dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                Scheduling
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Daily schedule, upcoming appointments, and quick status updates.
              </p>
            </CardHeader>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Patients
              </CardTitle>
              <p className="text-sm text-muted-foreground">Patient list, recent visits, and fast access to key details.</p>
            </CardHeader>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-primary" />
                Staff workflow
              </CardTitle>
              <p className="text-sm text-muted-foreground">Role-based access, invites, and a clean staff experience.</p>
            </CardHeader>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Analytics
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Revenue, appointments, and patient metrics driven by your database.
              </p>
            </CardHeader>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Billing
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Transactions and collections pulled from billing tables—no hardcoded rows.
              </p>
            </CardHeader>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Secure by default
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Supabase Auth + RLS for data, plus Edge Functions for guarded reads.
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
              <h3 className="text-2xl font-bold">Ready to switch from spreadsheets?</h3>
              <p className="text-muted-foreground max-w-2xl">
                Create an account, connect your clinic, and start seeing real billing + analytics instantly.
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/auth">
                  Start now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/contact">Contact</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <ModernFooter />
    </div>
  );
}
