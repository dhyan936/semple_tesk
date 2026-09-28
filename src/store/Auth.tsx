import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { endSession, login as loginAccount, register as registerAccount, restoreSession, type User } from '../lib/auth';
import { claimLegacyData } from '../lib/storage';

interface AuthValue {
  user: User | null;
  register: (name: string, email: string, password: string, remember: boolean) => Promise<User>;
  login: (email: string, password: string, remember: boolean) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(restoreSession);

  const register = useCallback(async (name: string, email: string, password: string, remember: boolean) => {
    const { user, first } = await registerAccount(name, email, password, remember);
    // Work saved before accounts existed belongs to the first person who registers.
    if (first) claimLegacyData(user.id);
    setUser(user);
    return user;
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const user = await loginAccount(email, password, remember);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    endSession();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, register, login, logout }), [user, register, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside AuthProvider');
  return auth;
}
