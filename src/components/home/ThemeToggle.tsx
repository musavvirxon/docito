import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
const ThemeToggle = () => {
  const {
    mode,
    setThemeMode
  } = useTheme();
  const modes = [{
    value: 'light' as const,
    icon: Sun,
    label: 'Day'
  }, {
    value: 'dark' as const,
    icon: Moon,
    label: 'Night'
  }, {
    value: 'auto' as const,
    icon: Monitor,
    label: 'Device'
  }];
  const handleModeClick = (value: 'light' | 'dark' | 'auto') => {
    // If clicking the current mode, switch back to auto
    if (mode === value) {
      setThemeMode('auto');
    } else {
      setThemeMode(value);
    }
  };
  return <div className="flex items-center gap-1 p-1 rounded-lg border-2 border-border bg-background">
      {modes.map(({
      value,
      icon: Icon,
      label
    }) => <button key={value} onClick={() => handleModeClick(value)} className={cn("relative p-2 rounded-md transition-all duration-200", "hover:bg-accent/10", mode === value && mode !== 'auto' && ["bg-primary text-primary-foreground", "shadow-sm"])} aria-label={`Switch to ${label} mode`} title={`${label} mode`}>
          <Icon className="w-4 h-4 text-black" />
        </button>)}
    </div>;
};
export default ThemeToggle;