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
  return <TooltipProvider delayDuration={300}>
      
    </TooltipProvider>;
};
export default ThemeToggle;