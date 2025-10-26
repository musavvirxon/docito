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
    // 7 AM (7) to 7 PM (19) is light mode, rest is dark
    return (hour >= 7 && hour < 19) ? 'light' : 'dark';
  };

  const getAutoTheme = (): AppliedTheme => {
    // Use time-based theme for automatic mode
    return getTimeBasedTheme();
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
