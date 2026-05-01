import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/contexts/auth-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { getAuthContext } from "@/lib/auth/session";
import { filterNav, groupNav } from "@/lib/nav/config";
import { getNavState } from "@/lib/nav/state";
import { getViewMode } from "@/lib/auth/view-mode";
import { getSelectedWarehouseId, getSelectedProjectId } from "@/lib/warehouse-context";
import { TourProvider } from "@/components/onboarding/TourProvider";
import { resolveWorkflow } from "@/lib/workflow/engine";
import { prisma } from "@/server/db/prisma";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nventr — Record Management Software",
  description: "Nventr record management software for warehouse operations",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();

  let workflowStages: import("@/lib/workflow/types").WorkflowStage[] | null = null;
  let selectedWarehouseId: string | null = null;
  let selectedProjectId: string | null = null;
  let warehouseOptions: { id: string; code: string; name: string }[] = [];
  let projectOptions: { id: string; code: string; name: string }[] = [];

  if (ctx) {
    selectedWarehouseId = await getSelectedWarehouseId();
    selectedProjectId = await getSelectedProjectId();
    warehouseOptions = await prisma.warehouse.findMany({
      where: { status: "ACTIVE" },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    });

    if (selectedWarehouseId) {
      projectOptions = await prisma.project.findMany({
        where: { warehouseId: selectedWarehouseId },
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true },
      });

      if (selectedProjectId) {
        const projectBelongsToWarehouse = projectOptions.some(
          (p) => p.id === selectedProjectId,
        );
        if (!projectBelongsToWarehouse) {
          selectedProjectId = null;
        }
      }

      const wf = await resolveWorkflow(
        selectedWarehouseId,
        selectedProjectId ?? undefined,
      );
      if (wf.id) {
        workflowStages = wf.stages;
      }
    }
  }

  const hiddenByAuth = new Set(ctx?.hiddenNavPaths ?? []);
  const navState = ctx ? await getNavState() : { labels: {}, hidden: [], custom: [] };
  const userHidden = new Set(navState.hidden);
  const viewMode = ctx ? await getViewMode() : null;
  const activeWarehouseLabel = (() => {
    if (!ctx || viewMode !== "operator" || !selectedWarehouseId) return null;
    const wh = warehouseOptions.find((w) => w.id === selectedWarehouseId);
    return wh ? `${wh.code} · ${wh.name}` : null;
  })();

  // In operator mode the user is scoped to a single warehouse, so the
  // cross-warehouse roll-ups in the sidebar (the global "Warehouses" list
  // and "Analytics") are noise — hide them. Admin keeps everything.
  const operatorHidden = new Set(
    viewMode === "operator" ? ["/warehouses", "/analytics"] : [],
  );

  const navItems = ctx
    ? filterNav(ctx.permissions, workflowStages).filter(
        (n) =>
          !hiddenByAuth.has(n.href) &&
          !userHidden.has(n.href) &&
          !operatorHidden.has(n.href),
      )
    : [];

  // OPERATE-only customizations: rename, delete, and inject user-added tabs.
  const groupedRaw = groupNav(navItems);
  const navGroups = groupedRaw.map((g) => {
    if (g.id !== "operate") return g;
    const renamed = g.items.map((it) => ({
      ...it,
      label: navState.labels[it.href] ?? it.label,
    }));
    const customs = navState.custom.map((c) => ({
      href: c.href,
      label: navState.labels[c.href] ?? c.label,
      permission: "_custom",
      icon: c.icon,
      fromWorkflow: false,
    }));
    return { ...g, items: [...renamed, ...customs] };
  });
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
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-white text-slate-800 antialiased dark:bg-navy dark:text-gray-200`}
      >
        <ThemeProvider>
          <TourProvider>
            <AuthProvider value={authClient}>
              <AppShell
                navGroups={navGroups}
                userLabel={ctx?.nickname ?? ctx?.fullName ?? ctx?.email ?? "Guest"}
                hasSession={!!ctx}
                warehouseOptions={warehouseOptions}
                selectedWarehouseId={selectedWarehouseId}
                projectOptions={projectOptions}
                selectedProjectId={selectedProjectId}
                hiddenOps={navState.hidden}
                customOps={navState.custom}
                viewMode={viewMode}
                activeWarehouseLabel={activeWarehouseLabel}
              >
                {children}
              </AppShell>
            </AuthProvider>
          </TourProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
