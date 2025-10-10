import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import i18n from '../i18n/config';

interface User {
  id: string;
  username: string;
  email: string;
  bio?: string;
  level: number;
  isVerified: boolean;
  isAdmin: boolean;
  createdAt: string;
  profile?: {
    displayName?: string;
    avatar?: string;
    location?: string;
    website?: string;
    avatarGradient?: string | null;
    bannerGradient?: string | null;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (emailOrUsername: string, password: string, remember?: boolean) => Promise<{ requires2FA: boolean }>;
  verify2FA: (token: string, recoveryCode?: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const applyUserLanguage = async () => {
    try {
      const response = await fetch('/api/users/me/settings', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const language = data?.settings?.language;

      if (typeof language === 'string' && language.length > 0 && language !== i18n.language) {
        await i18n.changeLanguage(language);
      }
    } catch (error) {
      console.error('Failed to load user language preference:', error);
    }
  };

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        await applyUserLanguage();
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (emailOrUsername: string, password: string, remember = false) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email: emailOrUsername, password, remember }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Login failed');
    }

    const data = await response.json();
    
    // Check if 2FA is required
    if (data.requires2FA) {
      return { requires2FA: true };
    }
    
    setUser(data.user);
    await applyUserLanguage();
    return { requires2FA: false };
  };

  const verify2FA = async (token: string, recoveryCode?: string) => {
    const response = await fetch('/api/login/2fa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ token, recoveryCode }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || '2FA verification failed');
    }

    const data = await response.json();
    setUser(data.user);
    await applyUserLanguage();
  };

  const register = async (username: string, email: string, password: string) => {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ name: username, email, password }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Registration failed');
    }

    const data = await response.json();
    setUser(data.user);
    await applyUserLanguage();
  };

  const logout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    login,
    verify2FA,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};