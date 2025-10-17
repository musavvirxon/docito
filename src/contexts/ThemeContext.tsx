import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const getThemeBasedOnTime = (): Theme => {
    const hour = new Date().getHours();
    return (hour >= 20 || hour < 6) ? 'dark' : 'light';
  };

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('docito-theme') as Theme | null;
    return saved || getThemeBasedOnTime();
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem('docito-theme');
    
    if (!savedTheme) {
      const autoTheme = getThemeBasedOnTime();
      setTheme(autoTheme);
      
      // Check every minute for automatic theme switching
      const interval = setInterval(() => {
        if (!localStorage.getItem('docito-theme')) {
          const newTheme = getThemeBasedOnTime();
          if (newTheme !== theme) {
            setTheme(newTheme);
          }
        }
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('docito-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
