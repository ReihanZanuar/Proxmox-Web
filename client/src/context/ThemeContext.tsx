import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeMode } from '../types/index.js';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  availableThemes: { id: ThemeMode; label: string; description: string }[];
}

const availableThemes: { id: ThemeMode; label: string; description: string }[] = [
  { id: 'dark', label: 'Dark Mode', description: 'Deep obsidian for high contrast' },
  { id: 'light', label: 'Light Mode', description: 'Clean slate modern daylight' },
  { id: 'neobrutalism', label: 'Neobrutalism', description: 'Bold black borders & pop colors' },
  { id: 'minimalist-bw', label: 'Minimalist B&W', description: 'Swiss monochrome typography' },
];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('pve_theme') as ThemeMode;
    if (saved && ['light', 'dark', 'neobrutalism', 'minimalist-bw'].includes(saved)) {
      return saved;
    }
    return 'dark';
  });

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('pve_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
