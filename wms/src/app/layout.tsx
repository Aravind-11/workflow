import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/contexts/auth-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { getAuthContext } from "@/lib/auth/session";
import { filterNav } from "@/lib/nav/config";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nventr — Record Management Software",
  description: "Nventr record management software for warehouse operations",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  const hidden = new Set(ctx?.hiddenNavPaths ?? []);
  const navItems = ctx
    ? filterNav(ctx.permissions).filter((n) => !hidden.has(n.href))
    : [];
  const authClient = ctx
    ? {
        email: ctx.email,
        fullName: ctx.fullName,
        nickname: ctx.nickname,
        permissions: [...ctx.permissions],
        roleNames: ctx.roleNames,
      }
    : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#F8FAFC] text-slate-800 dark:bg-navy dark:text-gray-200`}>
        <ThemeProvider>
          <AuthProvider value={authClient}>
            <AppShell
              navItems={navItems}
              userLabel={ctx?.nickname ?? ctx?.fullName ?? ctx?.email ?? "Guest"}
              hasSession={!!ctx}
            >
              {children}
            </AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
