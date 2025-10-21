import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type ThemeMode = 'light' | 'dark' | 'auto';
type AppliedTheme = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  appliedTheme: AppliedTheme;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'auto',
  appliedTheme: 'light',
  setThemeMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const getSystemTheme = (): AppliedTheme => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  const getTimeBasedTheme = (): AppliedTheme => {
    const hour = new Date().getHours();
    return (hour >= 20 || hour < 6) ? 'dark' : 'light';
  };

  const getAutoTheme = (): AppliedTheme => {
    // Try system preference first, fallback to time-based
    const systemTheme = getSystemTheme();
    return systemTheme || getTimeBasedTheme();
  };

  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('docito-theme-mode') as ThemeMode | null;
    return saved || 'auto';
  });

  const [appliedTheme, setAppliedTheme] = useState<AppliedTheme>(() => {
    if (mode === 'auto') {
      return getAutoTheme();
    }
    return mode as AppliedTheme;
  });

  // Apply theme to document
  const applyTheme = (themeMode: ThemeMode) => {
    let newAppliedTheme: AppliedTheme;
    
    if (themeMode === 'auto') {
      newAppliedTheme = getAutoTheme();
    } else {
      newAppliedTheme = themeMode as AppliedTheme;
    }

    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newAppliedTheme);
    setAppliedTheme(newAppliedTheme);
  };

  // Watch for system theme changes when in auto mode
  useEffect(() => {
    if (mode === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('auto');
      mq.addEventListener('change', handleChange);
      return () => mq.removeEventListener('change', handleChange);
    }
  }, [mode]);

  // Check every minute for time-based theme switching in auto mode
  useEffect(() => {
    if (mode === 'auto') {
      const interval = setInterval(() => {
        const newTheme = getAutoTheme();
        if (newTheme !== appliedTheme) {
          applyTheme('auto');
        }
      }, 60000); // Check every minute
      
      return () => clearInterval(interval);
    }
  }, [mode, appliedTheme]);

  // Apply theme whenever mode changes
  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  const setThemeMode = (newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem('docito-theme-mode', newMode);
  };

  return (
    <ThemeContext.Provider value={{ mode, appliedTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
