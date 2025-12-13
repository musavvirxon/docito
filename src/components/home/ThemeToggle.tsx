import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ThemeToggle = () => {
  const { mode, appliedTheme, setThemeMode } = useTheme();

  const modes = [
    {
      value: 'light' as const,
      icon: Sun,
      label: 'Day Mode',
      description: 'Light theme'
    },
    {
      value: 'dark' as const,
      icon: Moon,
      label: 'Night Mode',
      description: 'Dark theme'
    },
    {
      value: 'auto' as const,
      icon: Monitor,
      label: 'Auto Mode',
      description: '7am-7pm day, 7pm-7am night'
    }
  ];

  const handleModeClick = (value: 'light' | 'dark' | 'auto') => {
    setThemeMode(value);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5 p-1 rounded-full border border-border/50 bg-background/80 backdrop-blur-sm">
        {modes.map(({ value, icon: Icon, label, description }) => (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleModeClick(value)}
                className={cn(
                  "relative p-2 rounded-full transition-all duration-300",
                  "hover:bg-muted/50",
                  mode === value && [
                    "bg-primary text-primary-foreground",
                    "shadow-sm shadow-primary/25"
                  ]
                )}
                aria-label={label}
              >
                <Icon className={cn(
                  "w-4 h-4 transition-colors",
                  mode === value ? "text-primary-foreground" : "text-muted-foreground"
                )} />
                {/* Active indicator dot for auto mode showing current applied theme */}
                {mode === 'auto' && value === 'auto' && (
                  <span className={cn(
                    "absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                    appliedTheme === 'dark' ? "bg-violet-400" : "bg-amber-400"
                  )} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-popover text-popover-foreground">
              <p className="font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default ThemeToggle;