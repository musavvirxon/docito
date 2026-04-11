import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
const ThemeToggle = () => {
  const {
    mode,
    appliedTheme,
    setThemeMode
  } = useTheme();
  const modes = [{
    value: 'light' as const,
    icon: Sun,
    label: 'Day Mode',
    description: 'Light theme'
  }, {
    value: 'dark' as const,
    icon: Moon,
    label: 'Night Mode',
    description: 'Dark theme'
  }, {
    value: 'auto' as const,
    icon: Monitor,
    label: 'Auto Mode',
    description: '7am-7pm day, 7pm-7am night'
  }];
  const handleModeClick = (value: 'light' | 'dark' | 'auto') => {
    setThemeMode(value);
  };
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 p-1 rounded-full bg-muted/50">
        {modes.map((m) => (
          <Tooltip key={m.value}>
            <TooltipTrigger>
              <button
                onClick={() => handleModeClick(m.value)}
                className={cn(
                  "p-1.5 rounded-full transition-all duration-200",
                  mode === m.value
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={m.label}
              >
                <m.icon className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p className="font-medium">{m.label}</p>
              <p className="text-muted-foreground">{m.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};
export default ThemeToggle;