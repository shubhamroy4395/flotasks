import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeName = 'default' | 'dark' | 'spring' | 'winter';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeName>('default');

  useEffect(() => {
    // Load theme from localStorage on initial mount
    const savedTheme = localStorage.getItem('floTasks-theme') as ThemeName;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    // Save theme to localStorage whenever it changes
    localStorage.setItem('floTasks-theme', theme);
    
    // Apply theme class to document body
    document.body.classList.remove('theme-default', 'theme-dark', 'theme-spring', 'theme-winter');
    document.body.classList.add(`theme-${theme}`);
    
  }, [theme]);

  const value = { theme, setTheme };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};