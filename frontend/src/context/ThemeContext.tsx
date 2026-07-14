import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';
import { useToast } from './ToastContext';

export type ThemeMode = 'light' | 'dark';
export type ThemeColor = 'indigo' | 'emerald' | 'blue' | 'rose' | 'amber';

export interface ColorPalette {
  hex: string;
  hover: string;
  lightBg: string;
}

export const THEME_COLORS: Record<ThemeColor, ColorPalette> = {
  indigo: { hex: '#4f46e5', hover: '#4338ca', lightBg: 'rgba(79, 70, 229, 0.08)' },
  emerald: { hex: '#10b981', hover: '#059669', lightBg: 'rgba(16, 185, 129, 0.08)' },
  blue: { hex: '#3b82f6', hover: '#2563eb', lightBg: 'rgba(59, 130, 246, 0.08)' },
  rose: { hex: '#f43f5e', hover: '#e11d48', lightBg: 'rgba(244, 63, 94, 0.08)' },
  amber: { hex: '#f59e0b', hover: '#d97706', lightBg: 'rgba(245, 158, 11, 0.08)' }
};

interface ThemeContextProps {
  themeMode: ThemeMode;
  themeColor: ThemeColor;
  activeColor: ColorPalette;
  updateTheme: (mode: ThemeMode, color: ThemeColor) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [themeColor, setThemeColor] = useState<ThemeColor>('emerald');
  const [isLoading, setIsLoading] = useState(false);

  // Read theme properties from logged in user profile
  useEffect(() => {
    if (token && user) {
      const mode = (user.theme_mode as ThemeMode) || 'light';
      const color = (user.theme_color as ThemeColor) || 'emerald';
      setThemeMode(mode);
      setThemeColor(color);
      applyTheme(mode, color);
      // Persist to localStorage so the inline script can read on next page load (no-flash)
      localStorage.setItem('keepr_user_prefs', JSON.stringify({ theme_mode: mode, theme_color: color }));
    } else if (!token) {
      // User logged out - clear cached prefs
      localStorage.removeItem('keepr_user_prefs');
      // Force light mode and emerald green color
      setThemeMode('light');
      setThemeColor('emerald');
      applyTheme('light', 'emerald');
    }
  }, [user, token]);

  const applyTheme = (mode: ThemeMode, color: ThemeColor) => {
    const root = document.documentElement;
    const palette = THEME_COLORS[color] || THEME_COLORS.indigo;

    // Apply Dark/Light mode class
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply Brand Color CSS variables
    root.style.setProperty('--color-accent', palette.hex);
    root.style.setProperty('--color-accent-hover', palette.hover);
    root.style.setProperty('--color-accent-light', palette.lightBg);
    root.style.setProperty('--color-accent-dark-light', palette.lightBg);

    // Dynamically update PWA theme-color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', mode === 'dark' ? '#0A0A0A' : '#ffffff');
    }
  };

  const updateTheme = async (mode: ThemeMode, color: ThemeColor) => {
    setIsLoading(true);
    // Remember original values for revert
    const prevMode = themeMode;
    const prevColor = themeColor;
    try {
      applyTheme(mode, color);
      setThemeMode(mode);
      setThemeColor(color);
      // Persist immediately so next page load has no flash
      localStorage.setItem('keepr_user_prefs', JSON.stringify({ theme_mode: mode, theme_color: color }));

      // Only save to DB if logged in
      if (token) {
        await api.put('/api/auth/me', {
          theme_mode: mode,
          theme_color: color
        });
      }
    } catch (e: any) {
      console.error('Failed to update theme:', e);
      // Always revert optimistic theme update
      applyTheme(prevMode, prevColor);
      setThemeMode(prevMode);
      setThemeColor(prevColor);
      localStorage.setItem('keepr_user_prefs', JSON.stringify({ theme_mode: prevMode, theme_color: prevColor }));

      // If backend says PRO_REQUIRED, re-throw so callers can open the upgrade modal
      if (e.response?.status === 403 && e.response?.data?.code === 'PRO_REQUIRED') {
        throw e;
      }

      showToast('Tema kaydedilirken bir hata oluştu.', 'error');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const activeColor = THEME_COLORS[themeColor] || THEME_COLORS.emerald;

  return (
    <ThemeContext.Provider value={{ themeMode, themeColor, activeColor, updateTheme, isLoading }}>
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
