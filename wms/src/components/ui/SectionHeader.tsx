export function SectionHeader({
  title,
  description,
  children,
  eyebrow,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 space-y-3">
      <div>
        {eyebrow && (
          <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-gray-100 sm:text-[28px]">
          {title}
        </h1>
        <p className="mt-1.5 text-[13.5px] text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {children}
    </div>
  );
}
