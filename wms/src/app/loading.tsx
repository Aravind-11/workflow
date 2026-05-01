/**
 * Dashboard-shaped loading skeleton. Shown by Next.js while the root page
 * is suspending — including right after the user picks a warehouse on the
 * operator screen. Matches the real layout (hero + globe + KPI ribbon +
 * table) so the page swap feels deliberate instead of frozen.
 */
export default function Loading() {
  return (
    <div className="min-w-0 overflow-hidden">
      <section className="py-10 sm:py-14">
        <div className="space-y-4">
          <div className="h-3 w-64 animate-pulse rounded bg-slate-200/70 dark:bg-white/[0.06]" />
          <div className="space-y-3">
            <div className="h-9 w-3/4 animate-pulse rounded bg-slate-200/70 dark:bg-white/[0.06] sm:h-11" />
            <div className="h-9 w-2/4 animate-pulse rounded bg-slate-200/50 dark:bg-white/[0.04] sm:h-11" />
          </div>
          <div className="h-11 w-full max-w-2xl animate-pulse rounded-xl bg-slate-200/60 dark:bg-white/[0.05]" />
        </div>

        <div className="mt-10 flex items-center justify-center">
          <div className="relative aspect-square w-full max-w-[640px]">
            <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-radial from-slate-200/60 via-slate-100/30 to-transparent dark:from-white/[0.06] dark:via-white/[0.03] dark:to-transparent" />
            <div className="absolute inset-[8%] animate-pulse rounded-full ring-1 ring-inset ring-slate-300/40 dark:ring-white/[0.06]" />
            <div className="absolute inset-[20%] animate-pulse rounded-full ring-1 ring-inset ring-slate-300/30 dark:ring-white/[0.04]" />
          </div>
        </div>

        <hr className="hairline mt-4" />
      </section>

      <div className="space-y-12 pb-12 lg:space-y-16 lg:pb-16">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-slate-200/60 dark:bg-white/[0.04]"
              style={{ animationDelay: `${i * 70}ms` }}
            />
          ))}
        </div>

        <div className="grid min-w-0 gap-10 lg:grid-cols-[1fr_300px] lg:items-start lg:gap-12">
          <div className="space-y-4">
            <div className="h-3 w-48 animate-pulse rounded bg-slate-200/70 dark:bg-white/[0.06]" />
            <div className="space-y-2 rounded-xl border border-slate-200 p-1 dark:border-white/[0.06]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-slate-100/80 dark:bg-white/[0.025]"
                  style={{ animationDelay: `${i * 60}ms` }}
                />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-3 w-32 animate-pulse rounded bg-slate-200/70 dark:bg-white/[0.06]" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-slate-100/80 dark:bg-white/[0.025]"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
