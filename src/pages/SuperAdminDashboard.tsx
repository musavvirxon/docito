// File: src/pages/SuperAdminDashboard.tsx

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
import SystemLogs from "@/components/super-admin/SystemLogs";
import DocumentVerificationLookup from "@/components/super-admin/DocumentVerificationLookup";
import FinanceSourcesMapping from "@/components/super-admin/FinanceSourcesMapping";
import { useTranslation } from "react-i18next";

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
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold text-foreground">{t("superAdmin.title")}</h1>
                  <p className="text-muted-foreground">{t("superAdmin.subtitle")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <LanguageSwitcher />
                  <ThemeToggle />
                  <ProfileMenu />
                </div>
              </div>
            </div>

            <KPICards stats={stats} />
            <AnalyticsCharts stats={stats} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <AdvancedFinancialMetrics metrics={advancedMetrics} onRefresh={refreshAdvancedMetrics} />
                <ManagementTable />
              </div>
              <div className="space-y-6">
                <FeedbackInboxLink />
                <ActivityFeed />
              </div>
            </div>
          </div>
        );

      case "ecosystem":
        return <EcosystemOverview />;

      case "verifications":
        return (
          <div className="space-y-8">
            <VerificationTable />
            <DoctorVerificationTable />
            <FacilityVerificationRequestsTable />
          </div>
        );

      case "documentVerification":
        return <DocumentVerificationLookup />;

      case "doctors":
        return <EntityManagement entityType="doctors" />;

      case "practices":
        return <EntityManagement entityType="practices" />;

      case "pharmacies":
        return <EntityManagement entityType="pharmacies" />;

      case "laboratories":
        return <EntityManagement entityType="laboratories" />;

      case "imaging":
        return <EntityManagement entityType="imaging" />;

      case "referrals":
        return <ReferralManagement />;

      case "staff":
        return <GlobalStaffManagement />;

      case "patients":
        return <EntityManagement entityType="patients" />;

      case "appointments":
        return <EntityManagement entityType="appointments" />;

      case "payments":
        return <EntityManagement entityType="payments" />;

      case "analytics":
        return <AnalyticsCharts stats={stats} />;

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
    <div className="min-h-screen bg-background flex">
      <SuperAdminSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {renderContent()}
      </main>

      <InactivityWarningModal
        open={showWarning}
        countdown={countdown}
        onStayLoggedIn={stayLoggedIn}
        onLogout={handleInactive}
      />
    </div>
  );
};

export default SuperAdminDashboard;
