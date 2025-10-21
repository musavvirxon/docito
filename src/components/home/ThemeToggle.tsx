import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

const ThemeToggle = () => {
  const { mode, setThemeMode } = useTheme();
  
  const modes = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'auto' as const, icon: Monitor, label: 'Auto' },
  ];
  
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg border-2 border-border bg-background">
      {modes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setThemeMode(value)}
          className={cn(
            "relative p-2 rounded-md transition-all duration-200",
            "hover:bg-accent/10",
            mode === value && [
              "bg-primary text-primary-foreground",
              "shadow-sm"
            ]
          )}
          aria-label={`Switch to ${label} mode`}
          title={`${label} mode`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle;
