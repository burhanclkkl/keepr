import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  theme_mode?: string;
  theme_color?: string;
  view_layout?: string;
  created_at: string;
  is_pro: boolean;
  subscription_type?: string;
  subscription_source?: string;
  pro_since?: string | null;
  pro_expires_at?: string | null;
}

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (username: string, email: string, password: string, fullName?: string, kvkkAccepted?: boolean) => Promise<any>;
  updateProfile: (username?: string, email?: string, password?: string) => Promise<void>;
  logout: () => void;
  setSession: (token: string, refreshToken: string, user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('keepr_token'));
  const [loading, setLoading] = useState(true);

  // Initialize auth: fetch profile if token exists
  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          const response = await api.get<User>('/api/auth/me');
          setUser(response.data);
        } catch (e) {
          console.error('Error verifying existing token:', e);
          // Don't auto-logout immediately on network error; interceptors will handle 401s
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, [token]);

  // Global event listener for force logout/session expiration
  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem('keepr_token');
      localStorage.removeItem('keepr_refresh_token');
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth_unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth_unauthorized', handleUnauthorized);
    };
  }, []);

  const setSession = (receivedToken: string, receivedRefreshToken: string, receivedUser: User) => {
    localStorage.setItem('keepr_token', receivedToken);
    localStorage.setItem('keepr_refresh_token', receivedRefreshToken);
    setToken(receivedToken);
    setUser(receivedUser);
  };

  const login = async (email: string, password: string) => {
    const response = await api.post<any>('/api/auth/login', {
      email,
      password,
    });
    const data = response.data;
    if (data.token && data.refresh_token && data.user) {
      setSession(data.token, data.refresh_token, data.user);
    }
    return data;
  };

  const register = async (username: string, email: string, password: string, fullName?: string, kvkkAccepted?: boolean) => {
    const response = await api.post<any>('/api/auth/register', {
      username,
      email,
      password,
      full_name: fullName,
      kvkk_accepted: kvkkAccepted
    });
    const data = response.data;
    if (data.token && data.refresh_token && data.user) {
      setSession(data.token, data.refresh_token, data.user);
    }
    return data;
  };

  const updateProfile = async (username?: string, email?: string, password?: string) => {
    const payload: { username?: string; email?: string; password?: string } = {};
    if (username) payload.username = username;
    if (email) payload.email = email;
    if (password) payload.password = password;

    const response = await api.put<{ user: User }>('/api/auth/me', payload);
    setUser(response.data.user);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('keepr_refresh_token');
    try {
      if (refreshToken) {
        await api.post('/api/auth/logout', { refresh_token: refreshToken });
      }
    } catch (e) {
      // Proceed silently with local cleanup
    } finally {
      localStorage.removeItem('keepr_token');
      localStorage.removeItem('keepr_refresh_token');
      setToken(null);
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, loading, login, register, updateProfile, logout, setSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
