import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { LoginRequest, RegisterRequest, User } from '@/types/auth';
import { authService } from '@/services/auth';
import { getStoredToken, setStoredToken, removeStoredToken } from '@/lib/api';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<User>;
  register: (payload: RegisterRequest) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore authenticated session on application startup
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        if (isMounted) {
          setToken(null);
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const currentUser = await authService.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
          setToken(storedToken);
        }
      } catch {
        if (isMounted) {
          removeStoredToken();
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    // Listen to 401 Unauthorized events from Axios response interceptor
    const handleUnauthorized = () => {
      if (isMounted) {
        setUser(null);
        setToken(null);
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      isMounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (payload: LoginRequest): Promise<User> => {
    setIsLoading(true);
    try {
      const tokenData = await authService.login(payload);
      setStoredToken(tokenData.access_token);
      setToken(tokenData.access_token);

      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        return currentUser;
      } catch (err) {
        removeStoredToken();
        setToken(null);
        setUser(null);
        throw err;
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (payload: RegisterRequest): Promise<User> => {
    return await authService.register(payload);
  }, []);

  const logout = useCallback(() => {
    removeStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
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
