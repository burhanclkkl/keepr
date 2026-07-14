import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useAuth } from './AuthContext';
import api from '../services/api';

export type ThemeMode = 'light' | 'dark';
export type ThemeColor = 'indigo' | 'emerald' | 'blue' | 'rose' | 'amber';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  success: string;
  error: string;
  warning: string;
  background: string;
  card: string;
  text: string;
  textMuted: string;
  border: string;
  borderActive: string;
  tabBar: string;
}

export const BRAND_COLORS: Record<ThemeColor, { primary: string; light: string; dark: string }> = {
  indigo: { primary: '#4f46e5', light: '#818cf8', dark: '#3730a3' },
  emerald: { primary: '#10b981', light: '#34d399', dark: '#047857' },
  blue: { primary: '#3b82f6', light: '#60a5fa', dark: '#1d4ed8' },
  rose: { primary: '#f43f5e', light: '#fb7185', dark: '#be123c' },
  amber: { primary: '#f59e0b', light: '#fbbf24', dark: '#b45309' }
};

interface ThemeContextProps {
  themeMode: ThemeMode;
  themeColor: ThemeColor;
  colors: ThemeColors;
  updateTheme: (mode: ThemeMode, color: ThemeColor) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const systemScheme = useColorScheme();

  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [themeColor, setThemeColor] = useState<ThemeColor>('emerald');
  const [isLoading, setIsLoading] = useState(false);

  // Sync state with Auth Context profile
  useEffect(() => {
    if (token && user) {
      setThemeMode((user.theme_mode as ThemeMode) || 'light');
      setThemeColor((user.theme_color as ThemeColor) || 'emerald');
    } else {
      setThemeMode('light');
      setThemeColor('emerald');
    }
  }, [user, token, systemScheme]);

  const updateTheme = async (mode: ThemeMode, color: ThemeColor) => {
    setIsLoading(true);
    try {
      setThemeMode(mode);
      setThemeColor(color);

      if (token) {
        await api.put('/api/auth/me', {
          theme_mode: mode,
          theme_color: color
        });
      }
    } catch (e) {
      console.error('Failed to update mobile theme in DB:', e);
      // Revert if API failed and we have a user model
      if (user) {
        setThemeMode((user.theme_mode as ThemeMode) || 'light');
        setThemeColor((user.theme_color as ThemeColor) || 'emerald');
      }
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  // Compile active theme colors palette dynamically
  const accent = BRAND_COLORS[themeColor] || BRAND_COLORS.emerald;
  
  const colors: ThemeColors = {
    primary: accent.primary,
    primaryLight: accent.light,
    primaryDark: accent.dark,
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    ...(themeMode === 'dark'
      ? {
          background: '#000000', // Deep OLED black
          card: '#121212', // Dark card background
          text: '#f8fafc', // Light slate
          textMuted: '#64748b',
          border: '#1c1c1e',
          borderActive: '#2c2c2e',
          tabBar: '#121212',
        }
      : {
          background: '#f8f9fa', // Off-white
          card: '#ffffff',
          text: '#0f172a', // Dark slate
          textMuted: '#64748b',
          border: '#f1f5f9',
          borderActive: '#cbd5e1',
          tabBar: '#ffffff',
        })
  };

  return (
    <ThemeContext.Provider value={{ themeMode, themeColor, colors, updateTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
