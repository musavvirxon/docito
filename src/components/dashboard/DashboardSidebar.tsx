import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppRole } from '@/lib/rbac';
import { SidebarItem } from './DashboardShell';
import { DashboardBranding } from './DashboardBranding';

interface DashboardSidebarProps {
  items: SidebarItem[];
  activeItem: string;
  onItemChange: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  role: AppRole;
}

const roleColors: Record<string, string> = {
  doctor: 'from-blue-500/20 to-blue-600/10',
  patient: 'from-green-500/20 to-green-600/10',
  clinic_admin: 'from-purple-500/20 to-purple-600/10',
  admin: 'from-purple-500/20 to-purple-600/10',
  pharmacy_admin: 'from-amber-500/20 to-amber-600/10',
  lab_admin: 'from-cyan-500/20 to-cyan-600/10',
  imaging_admin: 'from-indigo-500/20 to-indigo-600/10',
  super_admin: 'from-red-500/20 to-red-600/10',
};

export function DashboardSidebar({
  items,
  activeItem,
  onItemChange,
  collapsed,
  onToggleCollapse,
  role,
}: DashboardSidebarProps) {
  const gradientClass = roleColors[role] || roleColors.patient;

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen flex flex-col border-r border-border/50 bg-gradient-to-b transition-all duration-300 relative",
        gradientClass,
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo area */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border/30">
        {!collapsed ? (
          <DashboardBranding size="md" />
        ) : (
          <DashboardBranding size="sm" className="justify-center" />
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onToggleCollapse}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Collapse button when collapsed */}
      {collapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 -right-3 h-6 w-6 rounded-full border bg-background shadow-sm z-10"
          onClick={onToggleCollapse}
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      )}

      {/* Navigation items */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => item.onClick ? item.onClick() : onItemChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                "hover:bg-background/60",
                activeItem === item.id
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
