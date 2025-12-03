import React, { createContext, useState, useEffect, useContext } from 'react';
import storage from '../utils/storage';
import api from '../services/api';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
}

interface AuthContextType {
  user: User | null;
  userToken: string | null;
  isLoading: boolean;
  signIn: (token: string, userData: User) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userToken: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await storage.getItem('userToken');
        const userData = await storage.getItem('userData');
        
        if (token && userData) {
          setUserToken(token);
          setUser(JSON.parse(userData));
        }
      } catch (e) {
        console.error('Failed to restore auth state:', e);
      }
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);

  const signIn = async (token: string, userData: User) => {
    await storage.setItem('userToken', token);
    await storage.setItem('userData', JSON.stringify(userData));
    setUserToken(token);
    setUser(userData);
  };

  const signOut = async () => {
    console.log('[Auth] signOut start. Current token:', userToken);
    try {
      await storage.removeItem('userToken');
      await storage.removeItem('userData');
      setUserToken(null);
      setUser(null);
      console.log('[Auth] signOut completed. Token cleared');
    } catch (error) {
      console.error('[Auth] signOut error:', error);
      setUserToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userToken, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
