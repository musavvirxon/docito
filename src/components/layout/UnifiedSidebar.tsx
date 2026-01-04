import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppRole } from '@/lib/rbac';

export interface SidebarNavItem {
  id: string;
  labelKey: string; // Translation key
  icon: ReactNode;
  badge?: string | number;
  onClick?: () => void;
  disabled?: boolean;
}

interface UnifiedSidebarProps {
  items: SidebarNavItem[];
  activeItem: string;
  onItemChange: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  role: AppRole;
  namespace?: string; // i18n namespace for translations
  logo?: ReactNode;
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

/**
 * UnifiedSidebar - Shared sidebar component for all facility dashboards
 * Supports translations via labelKey and i18n namespace
 */
export function UnifiedSidebar({
  items,
  activeItem,
  onItemChange,
  collapsed,
  onToggleCollapse,
  role,
  namespace = 'dashboard',
  logo,
}: UnifiedSidebarProps) {
  const { t, i18n } = useTranslation(namespace);
  const isRTL = i18n.dir() === 'rtl';
  const gradientClass = roleColors[role] || roleColors.patient;

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen flex flex-col border-border/50 bg-gradient-to-b transition-all duration-300",
        gradientClass,
        collapsed ? "w-16" : "w-64",
        isRTL ? "border-l" : "border-r"
      )}
    >
      {/* Logo area */}
      <div className={cn(
        "h-16 flex items-center justify-between border-border/30",
        collapsed ? "px-2" : "px-4",
        isRTL ? "flex-row-reverse border-l" : "border-b"
      )}>
        {!collapsed && (
          logo || (
            <span className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Docito
            </span>
          )
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onToggleCollapse}
        >
          {collapsed ? (
            isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation items */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => item.onClick ? item.onClick() : onItemChange(item.id)}
              disabled={item.disabled}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                "hover:bg-background/60 disabled:opacity-50 disabled:cursor-not-allowed",
                isRTL && "flex-row-reverse text-right",
                activeItem === item.id
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">
                    {t(`sidebar.${item.labelKey}`, item.labelKey)}
                  </span>
                  {item.badge !== undefined && (
                    <span className={cn(
                      "shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary",
                      isRTL && "order-first"
                    )}>
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

export default UnifiedSidebar;
