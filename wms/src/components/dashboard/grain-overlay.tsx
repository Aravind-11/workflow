"use client";

/**
 * Subtle SVG grain overlay. Killed by prefers-reduced-transparency and in
 * print. Sits fixed over the body at 8% opacity using mix-blend-overlay so
 * it darkens the surface texture imperceptibly without changing hue.
 */
export function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] opacity-[0.08] mix-blend-overlay print:hidden motion-reduce:opacity-0 [@media(prefers-reduced-transparency:reduce)]:hidden"
      style={{
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        backgroundSize: "160px 160px",
      }}
    />
  );
}
