import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthResponse, ApiError } from '../types/auth';
import apiClient from '../api/client';
import axios from 'axios';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: Record<string, string>) => Promise<void>;
  register: (credentials: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session from localStorage on initial render
  useEffect(() => {
    const storedToken = localStorage.getItem('apollo_token');
    const storedUser = localStorage.getItem('apollo_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // Sync state and handle auto-logout via window events
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      setError('Your session has expired. Please log in again.');
    };

    window.addEventListener('apollo_unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('apollo_unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (credentials: Record<string, string>) => {
    setIsLoading(true);
    setError(null);
    try {
      // Wrapped in aggressive AuthRateLimiter middleware on the server
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      const { access_token, user: loggedUser } = response.data;

      localStorage.setItem('apollo_token', access_token);
      localStorage.setItem('apollo_user', JSON.stringify(loggedUser));

      setToken(access_token);
      setUser(loggedUser);
    } catch (err) {
      handleApiError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: Record<string, string>) => {
    setIsLoading(true);
    setError(null);
    try {
      // Wrapped in aggressive AuthRateLimiter middleware on the server
      const response = await apiClient.post<AuthResponse>('/auth/register', credentials);
      const { access_token, user: registeredUser } = response.data;

      localStorage.setItem('apollo_token', access_token);
      localStorage.setItem('apollo_user', JSON.stringify(registeredUser));

      setToken(access_token);
      setUser(registeredUser);
    } catch (err) {
      handleApiError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Sends a POST /auth/logout to revoke current Sanctum token and append L1 telemetry
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.error('Logout request failed, cleaning local session anyway...', err);
    } finally {
      localStorage.removeItem('apollo_token');
      localStorage.removeItem('apollo_user');
      setToken(null);
      setUser(null);
      setError(null);
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  const handleApiError = (err: unknown) => {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data as ApiError | undefined;
      setError(data?.message || data?.error || 'A network error occurred.');
    } else {
      setError('An unexpected error occurred.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
