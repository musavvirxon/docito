import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import SuperAdminSidebar from "@/components/super-admin/SuperAdminSidebar";
import SuperAdminTopBar from "@/components/super-admin/SuperAdminTopBar";
import KPICards from "@/components/super-admin/KPICards";
import AnalyticsCharts from "@/components/super-admin/AnalyticsCharts";
import ManagementTable from "@/components/super-admin/ManagementTable";
import ActivityFeed from "@/components/super-admin/ActivityFeed";

const SuperAdminDashboard = () => {
  const { user, profile, loading } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (loading) {
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
    return <Navigate to="/auth" replace />;
  }

  // For now, allow any authenticated user - you can add role check later
  // if (profile?.role !== 'super_admin') {
  //   return <Navigate to="/dashboard" replace />;
  // }

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
