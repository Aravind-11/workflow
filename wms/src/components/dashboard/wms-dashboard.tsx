"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import dynamic from "next/dynamic";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityTicker } from "@/components/dashboard/activity-ticker";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { GrainOverlay } from "@/components/dashboard/grain-overlay";
import { OperationsStream } from "@/components/dashboard/operations-stream";
import { QuickActionsRail } from "@/components/dashboard/quick-actions-rail";
import { Reveal } from "@/components/dashboard/scroll-motion";
import { StatRibbon } from "@/components/dashboard/stat-ribbon";
import { WarehouseTable } from "@/components/dashboard/warehouse-table";

// Client-only: framer-motion's `useScroll` + `useTransform` produce inline
// styles that the server bundle and the client can serialize differently
// during early renders. Loading dynamically with ssr:false guarantees the
// progress bar is only ever rendered on the client, so there's nothing for
// hydration to mismatch on.
const ScrollProgress = dynamic(
  () =>
    import("@/components/dashboard/scroll-motion").then((m) => ({
      default: m.ScrollProgress,
    })),
  { ssr: false },
);
import type { DashboardSnapshot } from "@/features/dashboard/service";
import { geocodeWarehouse } from "@/lib/geo/geocode";
import { WarehouseGlobe, type GlobeMarker } from "./warehouse-globe";

const EASE = [0.16, 1, 0.3, 1] as const;

export type ViewModeProp = "admin" | "operator";

export function WmsDashboard({
  data,
  viewMode = "admin",
  activeWarehouse = null,
}: {
  data: DashboardSnapshot;
  viewMode?: ViewModeProp;
  activeWarehouse?: { id: string; code: string; name: string } | null;
}) {
  const {
    kpis,
    lowStockSamples,
    warehousePerformance,
    recentAudit,
    todaysSchedules,
    upcomingDocks,
    returnQueueSample,
  } = data;

  const [hoveredWarehouseId, setHoveredWarehouseId] = useState<string | null>(
    null,
  );

  // TODO: command palette already exists in AppShell — wire QuickActionsRail
  // to dispatch a window event the shell listens for. For now we expose a
  // synthetic ⌘K keypress so the existing global handler picks it up.
  const openCommandPalette = () => {
    const ev = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(ev);
  };

  // CRITICAL: must be memoized. WarehouseGlobe's init effect depends on
  // `markers`, so a fresh array reference on every parent re-render would
  // tear down + recreate the cobe canvas — visible as a flicker every time
  // the user hovers a marker or a row in the WarehouseTable (both of which
  // call setHoveredWarehouseId, which re-renders this component).
  const markers: GlobeMarker[] = useMemo(
    () =>
      warehousePerformance.map((w) => {
        const coords = geocodeWarehouse(w.city, w.state, w.country);
        return {
          id: w.id,
          code: w.code,
          name: w.name,
          city: w.city,
          state: w.state,
          lat: coords.lat,
          lng: coords.lng,
          onHandUnits: w.onHandUnits,
          openShipments: w.openShipments,
          activeTasks: w.activeTasks,
        };
      }),
    [warehousePerformance],
  );

  // Hero parallax: the headline lingers (drifts down + fades) as the user
  // scrolls past it. NOTE: we deliberately do NOT scale-transform the globe
  // wrapper — scale on a parent of the cobe <canvas> (which has
  // `contain: layout paint size`) causes repaint flicker on hover.
  const heroRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 80]);
  const heroOpacity = useTransform(scrollY, [0, 200, 520], [1, 1, 0.15]);
  const globeY = useTransform(scrollY, [0, 600], [0, 40]);

  return (
    <div className="min-w-0 overflow-hidden">
      <ScrollProgress />
      <GrainOverlay />

      <motion.section
        ref={heroRef}
        className="py-10 sm:py-14"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <motion.div style={reduce ? undefined : { y: heroY, opacity: heroOpacity }}>
          <DashboardHero
            generatedAt={data.generatedAt}
            viewMode={viewMode}
            activeWarehouse={activeWarehouse}
          />
        </motion.div>
        <motion.div
          className="mt-10"
          style={reduce ? undefined : { y: globeY }}
        >
          <WarehouseGlobe
            markers={markers}
            externalHoveredId={hoveredWarehouseId}
            onHoverChange={setHoveredWarehouseId}
          />
        </motion.div>
        <hr className="hairline mt-4" />
      </motion.section>

      <div className="space-y-12 pb-12 lg:space-y-16 lg:pb-16">
        <Reveal>
          <StatRibbon kpis={kpis} />
        </Reveal>

        <div className="grid min-w-0 gap-10 lg:grid-cols-[1fr_300px] lg:items-start lg:gap-12">
          <div className="min-w-0 space-y-12 lg:space-y-16">
            <Reveal>
              <SectionShell
                label="Warehouse performance"
                cta={{ href: "/warehouses", label: "View directory" }}
              >
                <WarehouseTable
                  rows={warehousePerformance}
                  hoveredId={hoveredWarehouseId}
                  onHoverChange={setHoveredWarehouseId}
                  lowStock={lowStockSamples}
                />
              </SectionShell>
            </Reveal>

            <Reveal>
              <OperationsStream
                shifts={todaysSchedules}
                docks={upcomingDocks}
                returns={returnQueueSample}
              />
            </Reveal>
          </div>

          <Reveal className="min-w-0" delay={0.05}>
            <QuickActionsRail onOpenCommandPalette={openCommandPalette} />
          </Reveal>
        </div>

        <Reveal>
          <ActivityTicker events={recentAudit} />
        </Reveal>
      </div>
    </div>
  );
}

function SectionShell({
  label,
  cta,
  children,
}: {
  label: string;
  cta?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-4">
      <div className="flex items-end justify-between gap-2">
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          {label}
        </h2>
        {cta && (
          <a
            href={cta.href}
            className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-gray-100"
          >
            {cta.label} →
          </a>
        )}
      </div>
      {children}
    </section>
  );
}
