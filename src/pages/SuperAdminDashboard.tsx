// src/pages/SuperAdminDashboard.tsx
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
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
import { useTranslation } from "react-i18next";
import UsersAdmin from "@/components/super-admin/UsersAdmin";
import SystemLogs from "@/components/super-admin/SystemLogs";

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
    } catch (error) {
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
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
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation("dashboard");

  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  const { data: stats } = useDashboardStats();
  const { metrics: advancedMetrics, refreshData: refreshAdvancedMetrics } =
    useAdvancedFinancialMetrics(stats?.totalRevenue || 0, "platform");

  const handleInactive = async () => {
    await supabase.auth.signOut();
    toast({
      title: t("superAdmin.sessionExpired"),
      description: t("superAdmin.sessionExpiredDesc"),
    });
  };

  const { showWarning, countdown, stayLoggedIn } = useInactivityTimer({
    onInactive: handleInactive,
    inactivityTime: 30 * 60 * 1000,
    warningTime: 60 * 1000,
    enabled: !!user && isSuperAdmin === true,
  });

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
      } catch (e) {
        console.error("Error checking super admin role:", e);
        setIsSuperAdmin(false);
      } finally {
        setCheckingRole(false);
      }
    };

    checkSuperAdminRole();
  }, [user?.id]);

  if (loading || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
              <h1 className="text-3xl font-bold text-foreground">
                {t("superAdmin.dashboard.title")}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t("superAdmin.dashboard.subtitle")}
              </p>
            </div>

            <KPICards />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <AnalyticsCharts showAll />
              <ActivityFeed />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <AdvancedFinancialMetrics
                metrics={advancedMetrics}
                revenue={stats?.totalRevenue || 0}
                onUpdateInputs={refreshAdvancedMetrics}
              />
              <ManagementTable title="Recent Activity" type="appointments" />
            </div>
          </div>
        );

      case "verifications":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Verifications</h1>
              <p className="text-muted-foreground mt-1">
                Facility verification requests (clinics, pharmacies, labs, imaging)
              </p>
            </div>
            <FacilityVerificationRequestsTable />
          </div>
        );

      case "doctors":
        return (
          <div className="space-y-6">
            <DoctorVerificationTable title="Pending Verifications" status="pending" />
            <DoctorVerificationTable title="Under Review" status="under_review" />
            <DoctorVerificationTable title="Verified Doctors" status="verified" />
            <DoctorVerificationTable title="Rejected Applications" status="declined" />
          </div>
        );

      case "practices":
        return (
          <div className="space-y-6">
            <VerificationTable title="Pending Verifications" status="pending" />
            <VerificationTable title="Under Review" status="under_review" />
            <VerificationTable title="Verified Practices" status="verified" />
            <VerificationTable title="Rejected Applications" status="rejected" />
          </div>
        );

      case "patients":
        return <UsersAdmin />;

      case "appointments":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Appointments</h1>
              <p className="text-muted-foreground mt-1">
                Review and manage recent appointments across the platform.
              </p>
            </div>
            <ManagementTable title="Appointments" type="appointments" />
          </div>
        );

      case "logs":
        return <SystemLogs />;

      case "ecosystem":
        return <EcosystemOverview />;

      case "analytics":
        return <AnalyticsCharts showAll />;

      case "payments":
        return (
          <AdvancedFinancialMetrics
            metrics={advancedMetrics}
            revenue={stats?.totalRevenue || 0}
            onUpdateInputs={refreshAdvancedMetrics}
          />
        );

      case "translations":
        return <TranslationManagement />;

      case "help":
        return <HelpArticlesManagement />;

      case "settings":
        return <SuperAdminSettingsPanel />;

      case "staff":
        return <GlobalStaffManagement />;

      case "referrals":
        return <ReferralManagement />;

      case "pharmacies":
        return <EntityManagement entityType="pharmacy" />;

      case "laboratories":
        return <EntityManagement entityType="laboratory" />;

      case "imaging":
        return <EntityManagement entityType="imaging" />;

      default:
        return null;
    }
  };

  return (
    <>
      <div className="flex min-h-screen w-full bg-background">
        <SuperAdminSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">
                  {t("superAdmin.dashboard.subtitle")}
                </p>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <FeedbackInboxLink onClick={() => setActiveSection("feedback")} />
                <ThemeToggle />
                <LanguageSwitcher />
                <ProfileMenu />
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-8 overflow-auto">{renderContent()}</main>

          <footer className="border-t border-border py-4 px-4 sm:px-8">
            <p className="text-sm text-muted-foreground">{t("superAdmin.footer")}</p>
          </footer>
        </div>
      </div>

      <InactivityWarningModal
        open={showWarning}
        countdown={countdown}
        onStayLoggedIn={stayLoggedIn}
      />
    </>
  );
};

export default SuperAdminDashboard;
