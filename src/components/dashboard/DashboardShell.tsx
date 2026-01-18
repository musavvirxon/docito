import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardFooter } from "./DashboardFooter";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppRole } from "@/lib/rbac";

export interface SidebarItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: string | number;
  onClick?: () => void;
}

interface DashboardShellProps {
  children: ReactNode;
  role: AppRole;
  entityName?: string;
  entityStatus?: "active" | "pending" | "verified" | "suspended";
  sidebarItems: SidebarItem[];
  activeItem: string;
  onItemChange: (id: string) => void;
  className?: string;
}

/**
 * Phase 6 fix:
 * - DashboardTopNav is now mounted ONLY by dashboard wrapper pages (AdminDashboard, StaffDashboard, LabDashboard, PharmacyDashboard, ImagingDashboard).
 * - This prevents double headers on dashboards that also use DashboardShell.
 */
export function DashboardShell({
  children,
  role,
  sidebarItems,
  activeItem,
  onItemChange,
  className,
}: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-[calc(100vh-64px)] bg-background flex w-full">
        {/* Sidebar */}
        <DashboardSidebar
          items={sidebarItems}
          activeItem={activeItem}
          onItemChange={onItemChange}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          role={role}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-[calc(100vh-64px)]">
          {/* Content */}
          <main className={cn("flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-6", className)}>
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>

          {/* Footer */}
          <DashboardFooter />
        </div>
      </div>
    </SidebarProvider>
  );
}
