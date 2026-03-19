"use client";

import { useAuth } from "@/contexts/auth-provider";

/** Hide children when the current user lacks this permission. */
export function Can({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const a = useAuth();
  if (!a?.permissions.includes(permission)) return null;
  return <>{children}</>;
}
