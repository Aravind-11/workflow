"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Mail, Lock, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const EASE = [0.16, 1, 0.3, 1] as const;

async function provisionUser(email: string, fullName: string): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fullName }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return body.error ?? "Failed to provision user record";
    }
    return null;
  } catch {
    return "Network error during user provisioning";
  }
}

export default function AuthPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user?.email) return;
      if (event !== "SIGNED_IN" && event !== "INITIAL_SESSION") return;
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) return;
      const meta = session.user.user_metadata as { full_name?: string } | undefined;
      const name = meta?.full_name?.trim() || session.user.email.split("@")[0];
      const err = await provisionUser(session.user.email, name);
      if (!err) window.location.href = "/start";
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setAwaitingEmailConfirmation(false);

    if (mode === "signup") {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined,
          data: { full_name: fullName.trim() || email.split("@")[0] },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      if (!signUpData.session) {
        setAwaitingEmailConfirmation(true);
        setLoading(false);
        return;
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
    }

    const provisionError = await provisionUser(email, fullName || email.split("@")[0]);
    if (provisionError) {
      setError(provisionError);
      setLoading(false);
      return;
    }

    window.location.href = "/start";
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4 text-slate-100 sm:p-6">
      {/* Ambient backdrop — large, far off-screen, low opacity. Should
          read as a gentle gradient wash, never a visible blob. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-[60vh] -top-[60vh] h-[120vh] w-[120vh] rounded-full bg-amber-500/[0.07] blur-[140px]"
          animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-[50vh] top-[20vh] h-[100vh] w-[100vh] rounded-full bg-blue-500/[0.06] blur-[140px]"
          animate={{ x: [0, -20, 0], y: [0, 25, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
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

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Brand mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
          className="mb-8 flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-2xl font-bold text-slate-950 shadow-[0_8px_32px_rgb(251_191_36_/_0.4)]">
              n
            </div>
            <motion.div
              className="absolute inset-0 rounded-2xl bg-amber-400/30 blur-xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight">nventr</h1>
            <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.3em] text-slate-400">
              Record Management Software
            </p>
          </div>
        </motion.div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 shadow-[0_30px_80px_-20px_rgb(0_0_0_/_0.6)] backdrop-blur-xl sm:p-8">
          <AnimatePresence mode="wait" initial={false}>
            {awaitingEmailConfirmation ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="space-y-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Mail size={20} />
                </div>
                <h2 className="text-xl font-semibold tracking-tight">Check your email</h2>
                <p className="text-sm leading-relaxed text-slate-300">
                  We sent a confirmation link to{" "}
                  <span className="font-medium text-white">{email}</span>. Open it to verify your
                  account, then come back and sign in.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAwaitingEmailConfirmation(false);
                    setMode("signin");
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm font-medium text-white ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10"
                >
                  Back to sign in
                  <ArrowRight size={14} />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                <h2 className="text-2xl font-semibold tracking-tight">
                  {mode === "signin" ? "Welcome back" : "Get started"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {mode === "signin"
                    ? "Sign in to your control tower."
                    : "Create your account to begin."}
                </p>

                <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                  {mode === "signup" && (
                    <Field
                      icon={<UserIcon size={15} />}
                      label="Full name"
                      type="text"
                      autoComplete="name"
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={setFullName}
                    />
                  )}
                  <Field
                    icon={<Mail size={15} />}
                    label="Email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={setEmail}
                    required
                  />
                  <Field
                    icon={<Lock size={15} />}
                    label="Password"
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={setPassword}
                    required
                    minLength={6}
                  />

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-inset ring-rose-500/30"
                    >
                      {error}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_8px_24px_-8px_rgb(251_191_36_/_0.6)] transition-all hover:shadow-[0_12px_32px_-8px_rgb(251_191_36_/_0.8)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {mode === "signin" ? "Signing in…" : "Creating account…"}
                      </>
                    ) : (
                      <>
                        {mode === "signin" ? "Sign in" : "Create account"}
                        <ArrowRight
                          size={15}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-5 text-center text-sm text-slate-400">
                  {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    className="font-medium text-amber-400 transition-colors hover:text-amber-300"
                    onClick={() => {
                      setMode(mode === "signin" ? "signup" : "signin");
                      setError("");
                    }}
                  >
                    {mode === "signin" ? "Create one" : "Sign in"}
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
          Secure auth · Supabase · TLS 1.3
        </p>
      </motion.div>
    </div>
  );
}

function Field({
  icon,
  label,
  type,
  autoComplete,
  placeholder,
  value,
  onChange,
  required,
  minLength,
}: {
  icon: React.ReactNode;
  label: string;
  type: string;
  autoComplete?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <div className="group relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-amber-400">
          {icon}
        </span>
        <input
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl bg-white/5 py-3 pl-10 pr-3.5 text-sm text-white placeholder-slate-500 ring-1 ring-inset ring-white/10 outline-none transition-all focus:bg-white/[0.07] focus:ring-amber-400/60"
        />
      </div>
    </label>
  );
}
