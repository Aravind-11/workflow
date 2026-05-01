"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowRight, Package, ShieldCheck } from "lucide-react";
import { chooseAdminAction } from "@/features/start/actions";

const EASE = [0.16, 1, 0.3, 1] as const;

export function StartScreen({
  userLabel,
}: {
  userLabel: string;
  /** Reserved — kept in props for future role-based gating. */
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const goAdmin = () => {
    startTransition(() => {
      chooseAdminAction();
    });
  };
  const goOperator = () => {
    router.push("/start/operator");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6 text-slate-100">
      <Backdrop />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative z-10 w-full max-w-3xl"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.5, ease: EASE }}
          className="mb-12 text-center"
        >
          <p className="font-mono text-[10.5px] uppercase tracking-[0.3em] text-slate-400">
            Welcome back, {userLabel}
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2">
          <ChoiceCard
            index={0}
            disabled={isPending}
            tint="amber"
            title="Admin"
            kicker="Cross-warehouse"
            description="See every warehouse, every metric, every team. Globe-wide visibility and the full nav."
            icon={<ShieldCheck size={22} />}
            onClick={goAdmin}
          />
          <ChoiceCard
            index={1}
            disabled={isPending}
            tint="blue"
            title="Operator"
            kicker="Single warehouse"
            description="Pick the floor you'll be working on. The dashboard and ops tabs scope to just that warehouse."
            icon={<Package size={22} />}
            onClick={goOperator}
          />
        </div>
      </motion.div>
    </div>
  );
}

function ChoiceCard({
  index,
  title,
  kicker,
  description,
  icon,
  tint,
  onClick,
  disabled,
}: {
  index: number;
  title: string;
  kicker: string;
  description: string;
  icon: React.ReactNode;
  /** Kept for backwards-compat; no longer rendered. */
  secondaryIcon?: React.ReactNode;
  tint: "amber" | "blue";
  onClick: () => void;
  disabled?: boolean;
}) {
  const tintClasses =
    tint === "amber"
      ? {
          ring: "hover:ring-amber-400/40",
          icon: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
          arrow: "text-amber-300",
        }
      : {
          ring: "hover:ring-blue-400/40",
          icon: "bg-blue-500/15 text-blue-300 ring-blue-400/30",
          arrow: "text-blue-300",
        };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.08, duration: 0.5, ease: EASE }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      className={`group relative flex flex-col items-start overflow-hidden rounded-2xl bg-white/[0.02] p-7 text-left ring-1 ring-inset ring-white/10 backdrop-blur-xl transition-all ${tintClasses.ring} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-60 blur-2xl transition-opacity group-hover:opacity-100"
        aria-hidden
        style={{
          background: `radial-gradient(circle, ${
            tint === "amber" ? "rgb(251 191 36 / 0.25)" : "rgb(59 130 246 / 0.25)"
          } 0%, transparent 70%)`,
        }}
      />

      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-inset ${tintClasses.icon}`}
      >
        {icon}
      </div>

      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
        {kicker}
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-slate-400">
        {description}
      </p>

      <span
        className={`mt-6 inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] ${tintClasses.arrow} transition-transform group-hover:translate-x-1`}
      >
        Continue <ArrowRight size={12} />
      </span>
    </motion.button>
  );
}

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-[60vh] -top-[60vh] h-[120vh] w-[120vh] rounded-full bg-amber-500/[0.06] blur-[140px]"
        animate={{ x: [0, 25, 0], y: [0, 18, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-[50vh] top-[20vh] h-[100vh] w-[100vh] rounded-full bg-blue-500/[0.05] blur-[140px]"
        animate={{ x: [0, -20, 0], y: [0, 25, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.5) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/80" />
    </div>
  );
}
