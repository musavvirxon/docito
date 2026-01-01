import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardTopBar } from './DashboardTopBar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppRole } from '@/lib/rbac';

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
  entityStatus?: 'active' | 'pending' | 'verified' | 'suspended';
  sidebarItems: SidebarItem[];
  activeItem: string;
  onItemChange: (id: string) => void;
  className?: string;
}

export function DashboardShell({
  children,
  role,
  entityName,
  entityStatus = 'active',
  sidebarItems,
  activeItem,
  onItemChange,
  className,
}: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
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
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Top bar */}
          <DashboardTopBar
            entityName={entityName}
            entityStatus={entityStatus}
            role={role}
          />

          {/* Content */}
          <main className={cn(
            "flex-1 overflow-auto",
            "px-4 sm:px-6 lg:px-8 py-6",
            className
          )}>
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
