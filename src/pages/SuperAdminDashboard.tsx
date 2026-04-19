// File: src/pages/SuperAdminDashboard.tsx

import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import { InactivityWarningModal } from "@/components/InactivityWarningModal";
import SuperAdminSidebar from "@/components/super-admin/SuperAdminSidebar";
import { useAdvancedFinancialMetrics } from "@/hooks/useAdvancedFinancialMetrics";
import { useDashboardStats } from "@/hooks/useSuperAdminData";
import AdvancedFinancialMetrics from "@/components/financial/AdvancedFinancialMetrics";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/home/ThemeToggle";
import ProfileMenu from "@/components/dashboard/ProfileMenu";
import FeedbackInboxLink from "@/components/super-admin/FeedbackInboxLink";
import KPICards from "@/components/super-admin/KPICards";
import AnalyticsCharts from "@/components/super-admin/AnalyticsCharts";
import ManagementTable from "@/components/super-admin/ManagementTable";
import ActivityFeed from "@/components/super-admin/ActivityFeed";
import VerificationTable from "@/components/super-admin/VerificationTable";
import DoctorVerificationTable from "@/components/super-admin/DoctorVerificationTable";
import SuperAdminSettingsPanel from "@/components/super-admin/SuperAdminSettingsPanel";
import TranslationManagement from "@/pages/TranslationManagement";
import HelpArticlesManagement from "@/components/super-admin/HelpArticlesManagement";
import EcosystemOverview from "@/components/super-admin/EcosystemOverview";
import EntityManagement from "@/components/super-admin/EntityManagement";
import GlobalStaffManagement from "@/components/super-admin/GlobalStaffManagement";
import ReferralManagement from "@/components/super-admin/ReferralManagement";
import FacilityVerificationRequestsTable from "@/components/super-admin/FacilityVerificationRequestsTable";
import SystemLogs from "@/components/super-admin/SystemLogs";
import DocumentVerificationLookup from "@/components/super-admin/DocumentVerificationLookup";
import FinanceSourcesMapping from "@/components/super-admin/FinanceSourcesMapping";
import BlogStudioSection from "@/components/super-admin/blog/BlogStudioSection";
import LandingCMSSection from "@/components/super-admin/LandingCMSSection";
import SupportInbox from "@/components/super-admin/SupportInbox";

const SUPER_ADMIN_SECTIONS = [
  "dashboard",
  "blogStudio",
  "landingCMS",
  "feedback",
  "supportInbox",
  "ecosystem",
  "verifications",
  "documentVerification",
  "doctors",
  "practices",
  "pharmacies",
  "laboratories",
  "imaging",
  "referrals",
  "staff",
  "patients",
  "appointments",
  "payments",
  "analytics",
  "financeSources",
  "translations",
  "help",
  "settings",
  "logs",
] as const;

type SuperAdminSection = (typeof SUPER_ADMIN_SECTIONS)[number];
const DEFAULT_SECTION: SuperAdminSection = "dashboard";

const isValidSection = (value: string | null): value is SuperAdminSection =>
  !!value && SUPER_ADMIN_SECTIONS.includes(value as SuperAdminSection);

const SuperAdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation("dashboard");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: t("superAdmin.login.authFailed"),
          description: error.message,
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: t("superAdmin.login.error"),
        description: t("superAdmin.login.unexpectedError"),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <Card className="mx-4 w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold">
            {t("superAdmin.login.title")}
          </CardTitle>
          <CardDescription className="text-center">
            {t("superAdmin.login.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("superAdmin.login.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@docito.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("superAdmin.login.password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("superAdmin.login.signingIn")}
                </>
              ) : (
                t("superAdmin.login.signIn")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const SuperAdminDashboard = () => {
  const { user, bootstrapped, signOut } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation("dashboard");
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSection = isValidSection(searchParams.get("section"))
    ? (searchParams.get("section") as SuperAdminSection)
    : DEFAULT_SECTION;

  const [activeSection, setActiveSection] = useState<SuperAdminSection>(initialSection);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  const { data: stats } = useDashboardStats();
  const { metrics: advancedMetrics } = useAdvancedFinancialMetrics(
    stats?.totalRevenue || 0,
    "platform",
  );

  const dashboardToolbar = useMemo(
    () => (
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <ThemeToggle />
        <ProfileMenu />
      </div>
    ),
    [],
  );

  const handleInactive = async () => {
    await signOut();
    toast({
      title: t("superAdmin.sessionExpired"),
      description: t("superAdmin.sessionExpiredDesc"),
    });
  };

  const { showWarning, countdown, stayLoggedIn } = useInactivityTimer({
    onInactive: handleInactive,
    inactivityTime: 60 * 60 * 1000,
    warningTime: 2 * 60 * 1000,
    enabled: !!user && isSuperAdmin === true,
  });

  useEffect(() => {
    const requestedSection = searchParams.get("section");
    if (isValidSection(requestedSection) && requestedSection !== activeSection) {
      setActiveSection(requestedSection);
    }
    if (!requestedSection && activeSection !== DEFAULT_SECTION) {
      setActiveSection(DEFAULT_SECTION);
    }
  }, [activeSection, searchParams]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (activeSection === DEFAULT_SECTION) {
          next.delete("section");
        } else {
          next.set("section", activeSection);
        }
        return next;
      },
      { replace: true },
    );
  }, [activeSection, setSearchParams]);

  useEffect(() => {
    const checkSuperAdminRole = async () => {
      if (!user) {
        setIsSuperAdmin(null);
        setCheckingRole(false);
        return;
      }

      setCheckingRole(true);

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "super_admin")
          .maybeSingle();

        if (error) {
          console.error("Error checking super admin role:", error);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(!!data);
        }
      } catch (error) {
        console.error("Error checking super admin role:", error);
        setIsSuperAdmin(false);
      } finally {
        setCheckingRole(false);
      }
    };

    checkSuperAdminRole();
  }, [user?.id]);

  if (!bootstrapped || checkingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return <SuperAdminLogin />;
  if (isSuperAdmin !== true) return <Navigate to="/dashboard" replace />;

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <div className="space-y-8">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold text-foreground">{t("superAdmin.title")}</h1>
                  <p className="text-muted-foreground">{t("superAdmin.subtitle")}</p>
                </div>
                {dashboardToolbar}
              </div>
            </div>

            <KPICards />
            <AnalyticsCharts showAll />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <AdvancedFinancialMetrics metrics={advancedMetrics} revenue={0} onUpdateInputs={() => {}} />
                <ManagementTable title="Overview" type="doctors" />
              </div>
              <div className="space-y-6">
                <FeedbackInboxLink onClick={() => setActiveSection("feedback")} />
                <ActivityFeed />
              </div>
            </div>
          </div>
        );

      case "blogStudio":
        return <BlogStudioSection />;

      case "landingCMS":
        return <LandingCMSSection />;

      case "feedback":
        return (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold text-foreground">Feedback Inbox</h1>
                <p className="text-muted-foreground">
                  Inbox access remains available here while Blog Studio is being built in parallel.
                </p>
              </div>
              {dashboardToolbar}
            </div>
            <FeedbackInboxLink onClick={() => {}} />
          </div>
        );

      case "supportInbox":
        return (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold text-foreground">Support Inbox</h1>
                <p className="text-muted-foreground">Contact form messages and admin video booking requests.</p>
              </div>
              {dashboardToolbar}
            </div>
            <SupportInbox />
          </div>
        );

      case "ecosystem":
        return <EcosystemOverview />;

      case "verifications":
        return (
          <div className="space-y-8">
            <VerificationTable title="Facility Verifications" />
            <DoctorVerificationTable title="Doctor Verifications" />
            <FacilityVerificationRequestsTable />
          </div>
        );

      case "documentVerification":
        return <DocumentVerificationLookup />;

      case "doctors":
        return <EntityManagement entityType={"doctors" as any} />;

      case "practices":
        return <EntityManagement entityType={"practices" as any} />;

      case "pharmacies":
        return <EntityManagement entityType="pharmacy" />;

      case "laboratories":
        return <EntityManagement entityType="laboratory" />;

      case "imaging":
        return <EntityManagement entityType="imaging" />;

      case "referrals":
        return <ReferralManagement />;

      case "staff":
        return <GlobalStaffManagement />;

      case "patients":
        return <EntityManagement entityType={"patients" as any} />;

      case "appointments":
        return <EntityManagement entityType={"appointments" as any} />;

      case "payments":
        return <EntityManagement entityType={"payments" as any} />;

      case "analytics":
        return <AnalyticsCharts showAll />;

      case "financeSources":
        return <FinanceSourcesMapping />;

      case "translations":
        return <TranslationManagement />;

      case "help":
        return <HelpArticlesManagement />;

      case "settings":
        return <SuperAdminSettingsPanel />;

      case "logs":
        return <SystemLogs />;

      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Section</CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Select a section from the sidebar.
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <SuperAdminSidebar
        activeSection={activeSection}
        onSectionChange={(section) => setActiveSection(section as SuperAdminSection)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
      />

      <main className="flex-1 overflow-y-auto p-6 md:p-8">{renderContent()}</main>

      <InactivityWarningModal
        open={showWarning}
        countdown={countdown}
        onStayLoggedIn={stayLoggedIn}
      />
    </div>
  );
};

export default SuperAdminDashboard;
