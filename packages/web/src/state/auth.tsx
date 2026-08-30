import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@resume/shared";
import { account } from "../api/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  update(name: string, title: string): Promise<void>;
  logout(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void account.me().then(({ user }) => setUser(user)).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  const value = useMemo<AuthContextValue>(() => ({
    user, loading,
    login: async (email, password) => setUser((await account.login(email, password)).user),
    register: async (name, email, password) => setUser((await account.register(name, email, password)).user),
    update: async (name, title) => setUser((await account.update(name, title)).user),
    logout: async () => { await account.logout(); setUser(null); },
  }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
