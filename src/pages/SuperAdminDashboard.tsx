import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import SuperAdminSidebar from "@/components/super-admin/SuperAdminSidebar";
import SuperAdminTopBar from "@/components/super-admin/SuperAdminTopBar";
import KPICards from "@/components/super-admin/KPICards";
import AnalyticsCharts from "@/components/super-admin/AnalyticsCharts";
import ManagementTable from "@/components/super-admin/ManagementTable";
import ActivityFeed from "@/components/super-admin/ActivityFeed";
import VerificationTable from "@/components/super-admin/VerificationTable";

const SuperAdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
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
          title: "Authentication failed",
          description: error.message,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
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
            Super Admin Access
          </CardTitle>
          <CardDescription className="text-center">
            Platform Owner Login - Authorized Personnel Only
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Password</Label>
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
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const SuperAdminDashboard = () => {
  const { user, profile, loading } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    const checkSuperAdminRole = async () => {
      if (!user) {
        setCheckingRole(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'super_admin'
        });

        if (error) {
          console.error('Error checking super admin role:', error);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(data === true);
        }
      } catch (error) {
        console.error('Error checking super admin role:', error);
        setIsSuperAdmin(false);
      } finally {
        setCheckingRole(false);
      }
    };

    checkSuperAdminRole();
  }, [user]);

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

  if (!user) {
    return <SuperAdminLogin />;
  }

  // SECURITY: Only users with super_admin role can access this dashboard
  // Role is verified via the user_roles table in Supabase
  if (isSuperAdmin !== true) {
    return <Navigate to="/dashboard" replace />;
  }

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
              <p className="text-muted-foreground mt-1">Platform metrics at a glance</p>
            </div>
            
            <KPICards />
            
            <AnalyticsCharts />
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <ManagementTable
                  title="Recent Appointments"
                  type="appointments"
                />
              </div>
              <div>
                <ActivityFeed />
              </div>
            </div>
          </div>
        );
      
      case "doctors":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Doctors Management</h1>
              <p className="text-muted-foreground mt-1">Manage all platform doctors</p>
            </div>
            <ManagementTable title="All Doctors" type="doctors" />
          </div>
        );
      
      case "practices":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Practices Management</h1>
              <p className="text-muted-foreground mt-1">Manage all medical practices</p>
            </div>
            <ManagementTable title="All Practices" type="practices" />
            
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Practice Verifications</h2>
              <VerificationTable title="Pending Verifications" status="under_review" />
            </div>
          </div>
        );
      
      case "patients":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Patients Management</h1>
              <p className="text-muted-foreground mt-1">View all platform patients</p>
            </div>
            <ManagementTable title="All Patients" type="patients" />
          </div>
        );
      
      case "appointments":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Appointments Management</h1>
              <p className="text-muted-foreground mt-1">Monitor all appointments</p>
            </div>
            <ManagementTable title="All Appointments" type="appointments" />
          </div>
        );
      
      case "payments":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Payments & Transactions</h1>
              <p className="text-muted-foreground mt-1">Financial overview and transactions</p>
            </div>
            <ManagementTable title="All Transactions" type="payments" />
          </div>
        );
      
      case "analytics":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Platform Analytics</h1>
              <p className="text-muted-foreground mt-1">Detailed insights and metrics</p>
            </div>
            <AnalyticsCharts showAll />
          </div>
        );
      
      case "settings":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
              <p className="text-muted-foreground mt-1">Configure platform settings</p>
            </div>
            <div className="bg-card border-2 border-border rounded-lg p-8">
              <p className="text-muted-foreground">Settings panel coming soon...</p>
            </div>
          </div>
        );
      
      case "logs":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">System Logs</h1>
              <p className="text-muted-foreground mt-1">Audit trail and system events</p>
            </div>
            <ActivityFeed showAll />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <SuperAdminSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex-1 flex flex-col">
        <SuperAdminTopBar />
        
        <main className="flex-1 p-8 overflow-auto">
          {renderContent()}
        </main>
        
        <footer className="border-t border-border py-4 px-8">
          <p className="text-sm text-muted-foreground">
            © 2025 Docito Admin Platform
          </p>
        </footer>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
