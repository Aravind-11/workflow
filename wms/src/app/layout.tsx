import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/contexts/auth-provider";
import { getAuthContext } from "@/lib/auth/session";
import { filterNav } from "@/lib/nav/config";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WMS - Warehouse Management",
  description: "Full-featured warehouse management system",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  const navItems = ctx ? filterNav(ctx.permissions) : [];
  const authClient = ctx
    ? {
        email: ctx.email,
        fullName: ctx.fullName,
        permissions: [...ctx.permissions],
        roleNames: ctx.roleNames,
      }
    : null;

  return (
    <html lang="en">
      <body className={`${inter.className} bg-surface`}>
        <AuthProvider value={authClient}>
          <AppShell
            navItems={navItems}
            userLabel={ctx?.fullName ?? ctx?.email ?? "Guest"}
            hasSession={!!ctx}
          >
            {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
