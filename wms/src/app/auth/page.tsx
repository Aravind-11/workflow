"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
  /** Supabase email confirmation is on: signUp returns no session until user clicks the link. */
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);

  /** Email confirmation link lands on /auth with a new session — provision MongoDB user and go to the app. */
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user?.email) return;
      if (event !== "SIGNED_IN" && event !== "INITIAL_SESSION") return;
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) return;
      const meta = session.user.user_metadata as { full_name?: string } | undefined;
      const name = meta?.full_name?.trim() || session.user.email.split("@")[0];
      const err = await provisionUser(session.user.email, name);
      if (!err) window.location.href = "/";
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

    window.location.href = "/";
  }

  const inputClass =
    "mt-1 w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none ring-blue-500/30 focus:border-blue-500 focus:ring-2 dark:border-navy-border dark:bg-navy dark:text-gray-200 dark:placeholder-gray-500";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-white p-4 dark:from-navy dark:to-navy-surface sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200/80 bg-white p-6 shadow-lg dark:border-navy-border dark:bg-navy-surface dark:shadow-black/30 sm:p-8">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Nventr Record Management Software</p>

        {awaitingEmailConfirmation ? (
          <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-slate-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-gray-200">
            <p className="font-medium text-slate-900 dark:text-gray-100">Check your email</p>
            <p className="leading-relaxed text-slate-700 dark:text-gray-300">
              We sent a confirmation link to <span className="font-medium">{email}</span>. Open it to verify your
              account, then come back and <strong>sign in</strong> with your password. Your workspace access is
              created on first successful sign-in.
            </p>
            <button
              type="button"
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-navy-border dark:bg-navy dark:text-gray-200 dark:hover:bg-white/5"
              onClick={() => {
                setAwaitingEmailConfirmation(false);
                setMode("signin");
              }}
            >
              Go to sign in
            </button>
          </div>
        ) : (
        <>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              Full name
              <input
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                className={inputClass}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>
          )}
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            Password
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="••••••••"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-11 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? (mode === "signin" ? "Signing in…" : "Creating account…") : (mode === "signin" ? "Sign in" : "Create account")}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError("");
              setAwaitingEmailConfirmation(false);
            }}
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
        </>
        )}
      </div>
    </div>
  );
}
