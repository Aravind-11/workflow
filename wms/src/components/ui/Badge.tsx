import { cn } from "@/lib/utils";

const VARIANT_CLASSES: Record<string, string> = {
  default:
    "bg-blue-50 text-blue-700 ring-blue-600/15 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/25",
  secondary:
    "bg-slate-100/80 text-slate-700 ring-slate-900/10 dark:bg-white/[0.04] dark:text-slate-300 dark:ring-white/10",
  success:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25",
  destructive:
    "bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/25",
};

export function Badge({
  children,
  text,
  variant = "secondary",
  className,
}: {
  children?: React.ReactNode;
  text?: string;
  variant?: "default" | "secondary" | "success" | "destructive";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children ?? text}
    </span>
  );
}

export default Badge;
