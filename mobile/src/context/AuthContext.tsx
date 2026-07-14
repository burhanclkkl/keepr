import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { registerLogoutCallback } from '../services/api';
import { getToken, saveToken, deleteToken, getRefreshToken, saveRefreshToken, deleteRefreshToken } from '../services/storage';

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
  token: string | null;
  loading: boolean;
  login: (token: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    registerLogoutCallback(() => {
      setToken(null);
      setUser(null);
    });
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get<User>('/api/auth/me');
      setUser(response.data);
    } catch (e) {
      console.error('Error fetching user profile:', e);
      await logout();
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedToken = await getToken();
        const savedRefreshToken = await getRefreshToken();
        
        if (savedToken) {
          setToken(savedToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
          
          try {
            const response = await api.get<User>('/api/auth/me');
            setUser(response.data);
          } catch (profileError) {
            console.log('Session access token expired, trying startup refresh...');
            if (savedRefreshToken) {
              try {
                const refreshResponse = await api.post<{ token: string; refresh_token: string }>('/api/auth/refresh', {
                  refresh_token: savedRefreshToken
                });
                const { token: newAccessToken, refresh_token: newRefreshToken } = refreshResponse.data;
                
                await saveToken(newAccessToken);
                await saveRefreshToken(newRefreshToken);
                setToken(newAccessToken);
                api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                
                const response = await api.get<User>('/api/auth/me');
                setUser(response.data);
              } catch (refreshError) {
                console.error('Startup refresh token rotation failed:', refreshError);
                await logout();
              }
            } else {
              await logout();
            }
          }
        }
      } catch (e) {
        console.error('Error initializing auth:', e);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const login = async (newToken: string, newRefreshToken: string, loggedUser: User) => {
    await saveToken(newToken);
    await saveRefreshToken(newRefreshToken);
    setToken(newToken);
    setUser(loggedUser);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const logout = async () => {
    const savedRefreshToken = await getRefreshToken();
    try {
      if (savedRefreshToken) {
        await api.post('/api/auth/logout', { refresh_token: savedRefreshToken });
      }
    } catch (e) {
      // Token might be already invalid or expired, proceed with local cleanup silently.
    } finally {
      await deleteToken();
      await deleteRefreshToken();
      setToken(null);
      setUser(null);
      delete api.defaults.headers.common['Authorization'];
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshProfile, setUser }}>
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
