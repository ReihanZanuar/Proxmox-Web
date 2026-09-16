import React, { createContext, useContext, useState, useEffect } from 'react';
import { ProxmoxAuthSession } from '../types/index.js';
import axios from 'axios';

interface LoginParams {
  host: string;
  username: string;
  password?: string;
  realm?: string;
  otp?: string;
}

interface AuthContextType {
  session: ProxmoxAuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (params: LoginParams) => Promise<void>;
  logout: () => void;
  startDemoMode: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<ProxmoxAuthSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Restore session from localStorage if exists
    try {
      const saved = localStorage.getItem('pve_session');
      if (saved) {
        setSession(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to parse saved session', e);
      localStorage.removeItem('pve_session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (params: LoginParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await axios.post('/api/auth/login', params);
      const data = res.data;

      const newSession: ProxmoxAuthSession = {
        ticket: data.ticket,
        csrfToken: data.csrfToken,
        username: data.username,
        host: data.host,
        realm: params.realm || 'pam',
        isMock: data.isMock || false,
      };

      setSession(newSession);
      localStorage.setItem('pve_session', JSON.stringify(newSession));
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Authentication failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const startDemoMode = () => {
    const demoSession: ProxmoxAuthSession = {
      ticket: 'PVE:demo_ticket_preview:999999',
      csrfToken: 'DEMO_CSRF_TOKEN_42',
      username: 'root@pam',
      host: 'demo',
      realm: 'pam',
      isMock: true,
    };

    setSession(demoSession);
    localStorage.setItem('pve_session', JSON.stringify(demoSession));
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem('pve_session');
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated: !!session,
        isLoading,
        error,
        login,
        logout,
        startDemoMode,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
