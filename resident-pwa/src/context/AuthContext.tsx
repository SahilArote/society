import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStoredUser, getStoredToken, setAuthSession, clearAuthSession, ResidentSessionUser } from '../services/authSession';
import { fetchCurrentUser } from '../services/api';
import { disconnectResidentSocket } from '../services/socket';

interface AuthContextType {
  user: ResidentSessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginSession: (token: string, user: ResidentSessionUser) => void;
  logoutSession: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  loginSession: () => {},
  logoutSession: () => {},
  refreshSession: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ResidentSessionUser | null>(getStoredUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshSession = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const meData = await fetchCurrentUser();
      if (meData) {
        const updatedUser: ResidentSessionUser = {
          id: meData.id,
          name: meData.name,
          mobile: meData.mobile,
          role: meData.role,
          societyId: meData.societyId,
          flatId: meData.flatId,
          flatNumber: meData.flatNumber,
          wing: meData.wing,
          societyName: meData.societyName || 'NexGate Residency',
        };
        setUser(updatedUser);
        setAuthSession(token, updatedUser);
      } else {
        clearAuthSession();
        setUser(null);
      }
    } catch (err) {
      console.warn('Session verification failed:', err);
      clearAuthSession();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const loginSession = (token: string, newUser: ResidentSessionUser) => {
    setAuthSession(token, newUser);
    setUser(newUser);
  };

  const logoutSession = () => {
    disconnectResidentSocket();
    clearAuthSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user && getStoredToken()),
        isLoading,
        loginSession,
        logoutSession,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
