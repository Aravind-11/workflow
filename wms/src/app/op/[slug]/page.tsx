import { notFound } from "next/navigation";
import { getNavState } from "@/lib/nav/state";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CustomOpPage({ params }: Props) {
  const { slug } = await params;
  const href = `/op/${slug}`;
  const state = await getNavState();
  const op = state.custom.find((c) => c.href === href);
  if (!op) notFound();

  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center shadow-sm dark:border-white/10 dark:bg-navy-surface/60">
      <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Custom operation
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-gray-100">
        {op.label}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        This is a placeholder for a user-defined operation. Hook it up to whatever
        data source or workflow your team needs next, or remove the tab from the
        sidebar editor when you&rsquo;re done with it.
      </p>
      <p className="mt-4 font-mono text-[11px] text-slate-400 dark:text-slate-500">
        slug: <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-white/[0.05]">{slug}</span>
      </p>
    </section>
  );
}
