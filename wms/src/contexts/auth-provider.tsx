"use client";

import { createContext, useContext } from "react";

export type AuthClientState = {
  email: string;
  fullName: string;
  nickname: string | null;
  permissions: string[];
  roleNames: string[];
};

const AuthContext = createContext<AuthClientState | null>(null);

export function AuthProvider({
  value,
  children,
}: {
  value: AuthClientState | null;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthClientState | null {
  return useContext(AuthContext);
}
