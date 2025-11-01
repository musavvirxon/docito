import { Home, Stethoscope, Building2, Users, Calendar, CreditCard, BarChart3, Settings, FileText, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/home/ThemeToggle";

interface SuperAdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "doctors", label: "Doctors", icon: Stethoscope },
  { id: "practices", label: "Practices", icon: Building2 },
  { id: "patients", label: "Patients", icon: Users },
  { id: "appointments", label: "Appointments", icon: Calendar },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "translations", label: "Translations", icon: Globe },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "logs", label: "System Logs", icon: FileText },
];

const SuperAdminSidebar = ({
  activeSection,
  onSectionChange,
  collapsed,
  onToggleCollapse,
}: SuperAdminSidebarProps) => {
  return (
    <aside
      className={cn(
        "border-r-2 border-border bg-sidebar-background transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b-2 border-border flex items-center justify-between">
          {!collapsed && (
            <div>
              <h2 className="text-xl font-bold text-foreground">Docito</h2>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="hover:bg-sidebar-accent"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                  "hover:bg-sidebar-accent",
                  isActive && [
                    "bg-sidebar-accent border-l-4 border-primary text-primary font-medium",
                    "dark:shadow-glow-blue"
                  ],
                  !isActive && "text-sidebar-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />
                {!collapsed && (
                  <span className="text-sm">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t-2 border-border space-y-3">
          <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
            {!collapsed && <span className="text-sm text-muted-foreground">Theme</span>}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SuperAdminSidebar;
