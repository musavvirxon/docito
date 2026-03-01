// File: src/components/super-admin/SuperAdminSidebar.tsx

import {
  Home,
  Stethoscope,
  Building2,
  Users,
  Calendar,
  CreditCard,
  BarChart3,
  Settings,
  FileText,
  ChevronLeft,
  ChevronRight,
  Globe,
  HelpCircle,
  Pill,
  FlaskConical,
  Scan,
  LayoutGrid,
  ArrowRightLeft,
  Inbox,
  ShieldCheck,
  QrCode,
  DollarSign,
  BookOpenText,
} from "lucide-react";
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
  { id: "blogStudio", label: "Blog Studio", icon: BookOpenText },
  { id: "feedback", label: "Feedback Inbox", icon: Inbox },
  { id: "ecosystem", label: "Ecosystem", icon: LayoutGrid },
  { id: "verifications", label: "Verifications", icon: ShieldCheck },
  { id: "documentVerification", label: "Document Verification", icon: QrCode },
  { id: "doctors", label: "Doctors", icon: Stethoscope },
  { id: "practices", label: "Clinics", icon: Building2 },
  { id: "pharmacies", label: "Pharmacies", icon: Pill },
  { id: "laboratories", label: "Laboratories", icon: FlaskConical },
  { id: "imaging", label: "Imaging Centers", icon: Scan },
  { id: "referrals", label: "Referrals", icon: ArrowRightLeft },
  { id: "staff", label: "Staff Management", icon: Users },
  { id: "patients", label: "Patients", icon: Users },
  { id: "appointments", label: "Appointments", icon: Calendar },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "financeSources", label: "Finance Sources", icon: DollarSign },
  { id: "translations", label: "Translations", icon: Globe },
  { id: "help", label: "Help Center", icon: HelpCircle },
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
        collapsed ? "w-20" : "w-64",
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b-2 border-border p-6">
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
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200",
                  "hover:bg-sidebar-accent",
                  isActive && [
                    "border-l-4 border-primary bg-sidebar-accent font-medium text-primary",
                    "dark:shadow-glow-blue",
                  ],
                  !isActive && "text-sidebar-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-primary")} />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="space-y-3 border-t-2 border-border p-4">
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
