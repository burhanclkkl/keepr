export const Colors = {
  // Brand colors
  primary: '#4f46e5', // Indigo-600
  primaryLight: '#818cf8', // Indigo-400
  primaryDark: '#3730a3', // Indigo-800
  
  // Status colors
  success: '#10b981', // Emerald-500
  error: '#ef4444', // Red-500
  warning: '#f59e0b', // Amber-500
  
  // Neutral Light theme colors
  light: {
    background: '#f8f9fa',
    card: '#ffffff',
    text: '#0f172a', // Slate-900
    textMuted: '#64748b', // Slate-500
    border: '#f1f5f9', // Slate-100
    borderActive: '#cbd5e1', // Slate-300
    tabBar: '#ffffff',
  },
  
  // Neutral Dark theme colors
  dark: {
    background: '#000000', // Deep OLED Black
    card: '#121212', // Premium Grey
    text: '#f8fafc', // Slate-50
    textMuted: '#64748b', // Slate-500
    border: '#1c1c1e', // System Gray 6
    borderActive: '#2c2c2e', // System Gray 5
    tabBar: '#121212',
  }
};

export const Typography = {
  titleLarge: {
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  titleMedium: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  bodyMedium: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  bodySmall: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  caption: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  }
};

export const Radius = {
  small: 6,
  medium: 10,
  large: 14,
  round: 9999,
};
