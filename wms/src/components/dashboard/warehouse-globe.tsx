"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import createGlobe from "cobe";
import Link from "next/link";
import { ArrowUpRight, Pause, Play, Locate, X } from "lucide-react";

const ZOOM_MIN = 1;
const ZOOM_MAX = 3.5;
const ZOOM_WHEEL_SENSITIVITY = 0.0015;

// Must match the `markerElevation` passed to createGlobe — keeps label
// projection in lockstep with the actual dots cobe paints on the canvas.
const MARKER_ELEVATION = 0.03;
// cobe scales marker positions by `(0.8 + markerElevation)` in its vertex
// shader (see shader `be` in cobe/dist/index.esm.js). We mirror that scale
// exactly so label screen positions match the dots pixel-for-pixel.
const GLOBE_RADIUS = 0.8 + MARKER_ELEVATION;

// Continental-US focal pose (see derivation on phiRef below).
const US_CENTER_PHI = -Math.PI / 2 - (-95 * Math.PI) / 180; // ≈ 0.087
const US_CENTER_THETA = (37 * Math.PI) / 180; // ≈ 0.646

export interface GlobeMarker {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  onHandUnits: number;
  openShipments: number;
  activeTasks: number;
}

interface Props {
  markers: GlobeMarker[];
  className?: string;
  /** Externally-controlled hover (e.g. from the warehouse table). Pulses the
      corresponding marker without selecting it. */
  externalHoveredId?: string | null;
  /** Notify the parent when the user hovers a marker on the globe so the
      table can highlight the matching row. */
  onHoverChange?: (id: string | null) => void;
}

/**
 * Interactive dotted globe showing a warehouse shipment network.
 *
 * - Drag horizontally to rotate longitude (phi)
 * - Drag vertically to rotate latitude (theta)
 * - Click a city in the list to fly the camera there
 * - Arcs visualize hub-and-spoke lanes between warehouses
 */
export function WarehouseGlobe({
  markers,
  className,
  externalHoveredId,
  onHoverChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  // Popup card anchored to the currently-selected marker. Positioned every
  // frame in the tick loop so it stays welded to the dot while dragging.
  const popupRef = useRef<HTMLDivElement>(null);
  // Mirror `selected` into a ref so the tick loop can read it without
  // re-running the whole effect on every selection change.
  const selectedRef = useRef<GlobeMarker | null>(null);

  const pointerStartX = useRef<number | null>(null);
  const pointerStartY = useRef<number | null>(null);
  const dragDeltaX = useRef(0);
  const dragDeltaY = useRef(0);
  const isDraggingRef = useRef(false);

  // Initial camera pose: face the continental US (~ -95°E, 37°N).
  //
  // Derivation (verified against cobe's vertex shader in index.esm.js):
  // cobe rotates a point p = U([lat, lng]) = [−cos(φ)cos(θ−π),
  // sin(φ), cos(φ)sin(θ−π)] by (phi, theta) and takes l.z as the depth.
  // Solving l.z(target) = +1 for the center-of-view point gives:
  //   phi   = −π/2 − L_rad
  //   theta = ψ_rad
  // So to center on (lat=37, lng=−95):
  //   phi   = −π/2 − (−95·π/180) ≈  0.087
  //   theta = 37·π/180            ≈  0.646
  const phiRef = useRef(US_CENTER_PHI);
  const thetaRef = useRef(US_CENTER_THETA);
  const widthRef = useRef(0);

  const [selected, setSelected] = useState<GlobeMarker | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  // Start static — the user controls rotation. Kept as an opt-in toggle.
  const [autoRotate, setAutoRotate] = useState(false);
  const autoRotateRef = useRef(false);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // Zoom. We scale the canvas visually via CSS transform and scale marker
  // label positions radially from center so everything stays aligned.
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Build arcs as a hub-and-spoke from the busiest warehouse.
  const { hub, arcs } = useMemo(() => {
    if (markers.length < 2) return { hub: null as GlobeMarker | null, arcs: [] };
    const sorted = [...markers].sort((a, b) => b.onHandUnits - a.onHandUnits);
    const hub = sorted[0];
    const arcs = sorted.slice(1).map((spoke) => ({
      from: [hub.lat, hub.lng] as [number, number],
      to: [spoke.lat, spoke.lng] as [number, number],
      // Soft white — reads as a network signal, not a warning/highlight.
      color: [0.78, 0.85, 1.0] as [number, number, number],
    }));
    return { hub, arcs };
  }, [markers]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    const measure = () => {
      // Read the container's offsetWidth — this is the *unscaled* logical
      // width. We can't use `canvas.getBoundingClientRect()` because the
      // canvas's visual transform (zoom) would bake into the measurement
      // and double-apply when we re-scale label positions.
      widthRef.current = container.offsetWidth;
    };
    measure();
    window.addEventListener("resize", measure);
    // Catch layout shifts that don't fire a window resize.
    const ro = new ResizeObserver(measure);
    ro.observe(container);

    const globeMarkers = markers.map((m) => ({
      location: [m.lat, m.lng] as [number, number],
      size: m.id === hub?.id ? 0.045 : 0.028,
      color: [0.98, 0.66, 0.12] as [number, number, number],
    }));

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: widthRef.current * 2,
      height: widthRef.current * 2,
      phi: phiRef.current,
      theta: thetaRef.current,
      mapSamples: 48000,
      mapBrightness: 9,
      mapBaseBrightness: 0.06,
      // Deep mid-blue ocean — vivid without being cartoony; lets land forms
      // pop with strong contrast.
      baseColor: [0.1, 0.16, 0.28],
      markerColor: [0.98, 0.66, 0.12],
      // Electric cyan-blue glow for that "Earth from orbit" feel.
      glowColor: [0.4, 0.6, 0.85],
      dark: 1,
      diffuse: 1.2,
      markers: globeMarkers,
      arcs,
      arcColor: [0.85, 0.92, 1.0],
      arcWidth: 0.5,
      arcHeight: 0.32,
      markerElevation: MARKER_ELEVATION,
    });

    // Precompute each marker's unit-sphere vector once. These are rotated
    // per-frame in the tick loop to produce screen positions that exactly
    // track wherever cobe paints the dot.
    const markerVecs = markers.map((m) => ({
      id: m.id,
      xyz: latLngToUnitVec(m.lat, m.lng),
    }));

    let rafId = 0;
    const tick = () => {
      if (pointerStartX.current === null && autoRotateRef.current) {
        phiRef.current += 0.0025;
      }
      const phi = phiRef.current + dragDeltaX.current / 200;
      const theta = clamp(thetaRef.current + dragDeltaY.current / 200, -1.2, 1.2);
      // Unscaled logical width — we re-apply zoom via CSS transform so the
      // underlying rendered resolution stays crisp at the device's DPR.
      const w = widthRef.current || container.offsetWidth;
      globe.update({
        phi,
        theta,
        width: w * 2,
        height: w * 2,
      });

      // These match cobe's vertex/projection math exactly.
      // cos(phi), sin(phi), cos(theta), sin(theta):
      const cp = Math.cos(phi);
      const sp = Math.sin(phi);
      const ct = Math.cos(theta);
      const st = Math.sin(theta);

      // Track the selected marker's screen position so we can anchor the
      // stats popup to it below.
      let popupSx = 0;
      let popupSy = 0;
      let popupVisible = false;
      const selId = selectedRef.current?.id ?? null;

      for (const { id, xyz } of markerVecs) {
        const el = labelRefs.current[id];
        const isSel = id === selId;
        if (!el && !isSel) continue;

        // Scale by GLOBE_RADIUS, exactly like cobe's shader does to p.
        const x = xyz[0] * GLOBE_RADIUS;
        const y = xyz[1] * GLOBE_RADIUS;
        const z = xyz[2] * GLOBE_RADIUS;

        // cobe's O(t) projection (from dist/index.esm.js):
        //   NDC_x = cp·x + sp·z
        //   NDC_y = sp·st·x + ct·y − cp·st·z
        //   depth = −sp·ct·x + st·y + cp·ct·z   (≥ 0 ⇒ front hemisphere)
        const xNDC = cp * x + sp * z;
        const yNDC = sp * st * x + ct * y - cp * st * z;
        const zDep = -sp * ct * x + st * y + cp * ct * z;

        // cobe's marker shader discards markers with `l.z < 0` that fall
        // inside the sphere silhouette — i.e., on the back. We hide labels
        // on that same condition so US-facing view never shows Asia-side
        // labels. Small hysteresis avoids flicker at the rim.
        const onFront = zDep >= -0.02;

        // cobe maps NDC to pixel: frac_x = (NDC_x + 1)/2, frac_y = (−NDC_y + 1)/2
        // → pixel_x = frac_x · canvasWidth, pixel_y = frac_y · canvasHeight.
        // Apply zoom by scaling the offset from the canvas center so label
        // positions track the CSS-scaled canvas beneath them.
        const zf = zoomRef.current;
        const cx = w / 2;
        const cy = w / 2;
        const sx = cx + (((xNDC + 1) / 2) * w - cx) * zf;
        const sy = cy + (((-yNDC + 1) / 2) * w - cy) * zf;

        // Clip to the visible canvas box when zoomed in (labels outside the
        // frame would otherwise escape the overflow-clipping container).
        const inBox = sx >= -8 && sx <= w + 8 && sy >= -8 && sy <= w + 8;
        const visible = onFront && inBox;

        if (el) {
          if (visible) {
            el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%)`;
            el.style.opacity = "1";
            el.style.pointerEvents = "auto";
          } else {
            el.style.opacity = "0";
            el.style.pointerEvents = "none";
          }
        }

        if (isSel) {
          popupSx = sx;
          popupSy = sy;
          popupVisible = visible;
        }
      }

      // Position the stats popup. Place it above the dot by default; if
      // there isn't room up top, flip it below so it never clips off-screen.
      const popupEl = popupRef.current;
      if (popupEl) {
        if (selId && popupVisible) {
          const popupH = popupEl.offsetHeight || 140;
          const flipBelow = popupSy - popupH - 24 < 0;
          const anchorY = flipBelow ? popupSy + 22 : popupSy - 22;
          // Centered horizontally on the dot; vertical origin flips with side.
          popupEl.style.transform = `translate3d(${popupSx}px, ${anchorY}px, 0) translate(-50%, ${flipBelow ? "0" : "-100%"})`;
          popupEl.style.opacity = "1";
          popupEl.style.pointerEvents = "auto";
        } else {
          popupEl.style.opacity = "0";
          popupEl.style.pointerEvents = "none";
        }
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    requestAnimationFrame(() => {
      if (canvas) canvas.style.opacity = "1";
    });

    return () => {
      cancelAnimationFrame(rafId);
      globe.destroy();
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [markers, arcs, hub?.id]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerStartX.current = e.clientX - dragDeltaX.current;
    pointerStartY.current = e.clientY - dragDeltaY.current;
    isDraggingRef.current = false;
    e.currentTarget.style.cursor = "grabbing";
  }, []);

  const commitDrag = useCallback(() => {
    phiRef.current += dragDeltaX.current / 200;
    thetaRef.current = clamp(thetaRef.current + dragDeltaY.current / 200, -1.2, 1.2);
    dragDeltaX.current = 0;
    dragDeltaY.current = 0;
    pointerStartX.current = null;
    pointerStartY.current = null;
    // Let click handlers re-enable on the next tick.
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      commitDrag();
      e.currentTarget.style.cursor = "grab";
    },
    [commitDrag],
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerStartX.current !== null && pointerStartY.current !== null) {
      dragDeltaX.current = e.clientX - pointerStartX.current;
      dragDeltaY.current = e.clientY - pointerStartY.current;
      if (Math.abs(dragDeltaX.current) > 3 || Math.abs(dragDeltaY.current) > 3) {
        isDraggingRef.current = true;
      }
    }
  }, []);

  // Click on the empty globe background (not on a marker label) dismisses
  // the stats popup. Markers have their own `onClick` handlers and don't
  // bubble up here, so a canvas click is always a "deselect" intent.
  // Guard against the synthetic click the browser fires at the end of a
  // drag by checking `isDraggingRef`.
  const onCanvasClick = useCallback(() => {
    if (isDraggingRef.current) return;
    setSelected(null);
  }, []);

  const focusMarker = useCallback((m: GlobeMarker) => {
    // Same camera convention as the initial pose above:
    //   phi   = −π/2 − L_rad   (center on longitude L)
    //   theta = ψ_rad          (center on latitude ψ)
    const targetPhi = -Math.PI / 2 - (m.lng * Math.PI) / 180;
    const targetTheta = (m.lat * Math.PI) / 180;

    const startPhi = phiRef.current;
    const startTheta = thetaRef.current;

    // Shortest rotation
    const delta = ((targetPhi - startPhi) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;

    const startTime = performance.now();
    const duration = 1100;
    dragDeltaX.current = 0;
    dragDeltaY.current = 0;

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      phiRef.current = startPhi + delta * eased;
      thetaRef.current = startTheta + (targetTheta - startTheta) * eased;
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    setSelected(m);
    setAutoRotate(false);
  }, []);

  const resetView = useCallback(() => {
    phiRef.current = US_CENTER_PHI;
    thetaRef.current = US_CENTER_THETA;
    dragDeltaX.current = 0;
    dragDeltaY.current = 0;
    setSelected(null);
    setAutoRotate(false);
    setZoom(1);
  }, []);

  // Wheel zoom: natural direction (scroll up = zoom in). We attach
  // non-passively so we can preventDefault and stop the page from scrolling
  // while the user zooms over the globe.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) =>
        clamp(z - e.deltaY * ZOOM_WHEEL_SENSITIVITY, ZOOM_MIN, ZOOM_MAX),
      );
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        {/* ─── Globe ───────────────────────────────────────────── */}
        <div
          ref={containerRef}
          className="relative aspect-square w-full max-w-[600px] justify-self-center lg:justify-self-start"
        >
          {/* Soft halo behind the globe. Sits OUTSIDE the clip wrapper so
              its blur can bleed freely into the page background — otherwise
              the rectangular clip edge reads as a hard panel border. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[-20%] -z-10 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(96,165,250,0.22) 0%, rgba(96,165,250,0.06) 38%, transparent 65%)",
              transform: `scale(${zoom})`,
              transformOrigin: "center",
              transition: "transform 180ms ease-out",
            }}
          />

          {/* Clip wrapper — only the canvas + labels need clipping so they
              don't leak out when the user zooms in. Everything else (halo,
              popup, overlay controls) renders outside this clip. */}
          <div className="absolute inset-0 overflow-hidden">
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerMove={onPointerMove}
              onClick={onCanvasClick}
              onDoubleClick={resetView}
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                cursor: "grab",
                opacity: 0,
                transition: "opacity 1s ease, transform 180ms ease-out",
                touchAction: "none",
                contain: "layout paint size",
                transform: `scale(${zoom})`,
                transformOrigin: "center",
              }}
            />

            {/* Clickable marker labels. Each one is positioned every frame
                inside the RAF tick by projecting its lat/lng into canvas
                pixel-space using the exact rotation matrix cobe uses to paint
                the dots — so the label stays welded to its city and is hidden
                the moment the city rotates to the back hemisphere. */}
            <div className="pointer-events-none absolute inset-0">
            {markers.map((m) => {
              const isActive =
                selected?.id === m.id ||
                hovered === m.id ||
                externalHoveredId === m.id;
              const isHub = hub?.id === m.id;
              const shortCode = m.code.split("-")[0];
              return (
                <button
                  key={m.id}
                  ref={(el) => {
                    labelRefs.current[m.id] = el;
                  }}
                  type="button"
                  onClick={() => {
                    if (isDraggingRef.current) return;
                    focusMarker(m);
                  }}
                  onMouseEnter={() => {
                    setHovered(m.id);
                    onHoverChange?.(m.id);
                  }}
                  onMouseLeave={() => {
                    setHovered(null);
                    onHoverChange?.(null);
                  }}
                  aria-label={`${m.name} — ${m.city}`}
                  className="group flex cursor-pointer flex-col items-center gap-0.5"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    opacity: 0,
                    transition: "opacity 220ms ease-out",
                    whiteSpace: "nowrap",
                    willChange: "transform, opacity",
                  }}
                >
                  {/* Outer ring — pulses on the hub and when active */}
                  <span
                    className={`relative flex h-3 w-3 items-center justify-center ${
                      isActive || isHub ? "animate-pulse" : ""
                    }`}
                  >
                    <span
                      className={`absolute inset-0 rounded-full ${
                        isActive
                          ? "bg-amber-400/40"
                          : isHub
                            ? "bg-amber-400/30"
                            : "bg-amber-400/15"
                      }`}
                    />
                    <span
                      className={`relative h-1.5 w-1.5 rounded-full ${
                        isActive ? "bg-amber-300" : "bg-amber-400"
                      }`}
                    />
                  </span>
                  {/* Label */}
                  <span
                    className={`whitespace-nowrap border bg-slate-900/80 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-200 backdrop-blur-sm transition-colors ${
                      isActive
                        ? "border-amber-400/80 bg-amber-500/90 text-slate-900"
                        : "border-white/10 group-hover:border-amber-400/60 group-hover:text-amber-100"
                    }`}
                    style={{
                      boxShadow:
                        "0 2px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)",
                    }}
                  >
                    {shortCode}
                  </span>
                </button>
              );
            })}
            </div>
          </div>

          {/* Stats popup — anchored to the selected marker by the tick loop
              above. Sits outside the clip wrapper so it can extend beyond
              the globe's bounding box when anchored near the edge. */}
          <div
            ref={popupRef}
            role="dialog"
            aria-label={selected ? `${selected.name} stats` : undefined}
            className="absolute left-0 top-0 w-56 border border-amber-400/40 bg-slate-950/95 text-gray-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-md"
            style={{
              opacity: 0,
              pointerEvents: "none",
              transition: "opacity 180ms ease-out",
              willChange: "transform, opacity",
              zIndex: 10,
            }}
          >
            {selected && (
              <>
                {/* Connector line from the dot up to the card (or down,
                    when flipped). Purely decorative. */}
                <div className="relative">
                  <div className="flex items-start justify-between gap-2 border-b border-white/10 px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                          {selected.code}
                        </span>
                        {hub?.id === selected.id && (
                          <span className="font-mono text-[9px] font-medium uppercase tracking-widest text-amber-400/80">
                            · Hub
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-[13px] font-semibold leading-tight text-gray-100">
                        {selected.name}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-slate-400">
                        {selected.city}, {selected.state}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="shrink-0 rounded-sm p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-gray-200"
                      aria-label="Close"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <dl className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/10">
                    <PopupStat label="On hand" value={selected.onHandUnits} />
                    <PopupStat label="Shipments" value={selected.openShipments} />
                    <PopupStat label="Tasks" value={selected.activeTasks} />
                  </dl>

                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
                      {hub && selected.id !== hub.id
                        ? `Lane · ${hub.code} → ${selected.code}`
                        : "Live"}
                    </span>
                    <Link
                      href={`/warehouses/${selected.id}`}
                      className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-300 transition-colors hover:text-amber-200"
                    >
                      Open
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Overlay controls — bottom-left: playback + reset */}
          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5">
            <GlobeButton
              onClick={() => setAutoRotate((v) => !v)}
              label={autoRotate ? "Pause" : "Play"}
              Icon={autoRotate ? Pause : Play}
            />
            <GlobeButton onClick={resetView} label="Reset" Icon={Locate} />
          </div>

          <div className="absolute bottom-3 right-3 z-20 hidden items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 sm:flex">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
            Drag · Scroll to zoom · Double-click to reset
          </div>
        </div>

        {/* ─── Side panel ──────────────────────────────────────── */}
        <div className="flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-500">
              Network · {markers.length} nodes
            </span>
            {hub && (
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">
                Hub · {hub.code}
              </span>
            )}
          </div>
          <div className="space-y-px">
            {markers.map((m) => {
              const isActive =
                selected?.id === m.id ||
                hovered === m.id ||
                externalHoveredId === m.id;
              const isHub = hub?.id === m.id;
              return (
                <div
                  key={m.id}
                  onMouseEnter={() => {
                    setHovered(m.id);
                    onHoverChange?.(m.id);
                  }}
                  onMouseLeave={() => {
                    setHovered(null);
                    onHoverChange?.(null);
                  }}
                  className="group"
                >
                  <button
                    type="button"
                    onClick={() => focusMarker(m)}
                    className={`flex w-full items-center justify-between gap-3 border-l-2 px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? "border-amber-500 bg-slate-100 dark:bg-white/5"
                        : "border-transparent hover:border-slate-300 hover:bg-slate-50 dark:hover:border-white/20 dark:hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`relative h-2 w-2 rounded-full ${
                            isActive
                              ? "bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.25)]"
                              : isHub
                                ? "bg-amber-500/70"
                                : "bg-slate-400 dark:bg-slate-600"
                          }`}
                        />
                        <span className="font-mono text-xs font-medium text-slate-900 dark:text-gray-100">
                          {m.code}
                        </span>
                        {isHub && (
                          <span className="font-mono text-[9px] font-medium uppercase tracking-widest text-amber-600 dark:text-amber-400">
                            Hub
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {m.city}, {m.state}
                      </p>
                    </div>
                    <Link
                      href={`/warehouses/${m.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 rounded p-1 text-slate-400 opacity-0 transition-opacity hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-gray-200"
                      aria-label={`Open ${m.name}`}
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </button>
                </div>
              );
            })}
          </div>

          {selected && (
            <div className="mt-5 border-t border-slate-200 pt-4 dark:border-white/10">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">
                Selected
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-gray-100">
                {selected.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selected.city}, {selected.state}
              </p>
              <dl className="mt-3 space-y-1.5 text-xs">
                <Stat label="On hand" value={selected.onHandUnits.toLocaleString()} />
                <Stat label="Open shipments" value={selected.openShipments.toLocaleString()} />
                <Stat label="Active tasks" value={selected.activeTasks.toLocaleString()} />
                {hub && selected.id !== hub.id && (
                  <Stat label="Lane" value={`${hub.code} → ${selected.code}`} />
                )}
              </dl>
              <Link
                href={`/warehouses/${selected.id}`}
                className="mt-4 inline-flex items-center gap-1.5 border-b border-slate-900 pb-0.5 font-mono text-[11px] font-medium uppercase tracking-widest text-slate-900 transition-colors hover:border-amber-500 hover:text-amber-600 dark:border-gray-100 dark:text-gray-100 dark:hover:border-amber-400 dark:hover:text-amber-400"
              >
                Open warehouse
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-dashed border-slate-100 pb-1 dark:border-white/5">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-mono tabular-nums text-slate-900 dark:text-gray-100">{value}</dd>
    </div>
  );
}

function PopupStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-2 py-1.5 text-center">
      <dt className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono text-[13px] font-semibold tabular-nums text-gray-100">
        {value.toLocaleString()}
      </dd>
    </div>
  );
}

function GlobeButton({
  onClick,
  label,
  Icon,
}: {
  onClick: () => void;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-7 items-center gap-1.5 border border-slate-200 bg-white/80 px-2 font-mono text-[10px] font-medium uppercase tracking-widest text-slate-700 backdrop-blur transition-colors hover:border-slate-900 hover:text-slate-900 dark:border-white/10 dark:bg-navy-surface/70 dark:text-slate-300 dark:hover:border-white/30 dark:hover:text-gray-100"
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Convert (lat, lng) in degrees to a unit-sphere vector that matches
 * cobe's internal convention. Derivation mirrors cobe's `U([lat, lng])`.
 */
function latLngToUnitVec(lat: number, lng: number): [number, number, number] {
  const phi = (lat * Math.PI) / 180;
  const theta = (lng * Math.PI) / 180 - Math.PI;
  const c = Math.cos(phi);
  return [-c * Math.cos(theta), Math.sin(phi), c * Math.sin(theta)];
}
