"use client";

import { useState } from "react";
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(signUpError.message);
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-white p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200/80 bg-white p-6 shadow-lg sm:p-8">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-gray-900">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mb-6 text-sm text-gray-500">Warehouse Management System</p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label className="block text-xs font-medium text-gray-600">
              Full name
              <input
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                className="mt-1 w-full min-h-11 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none ring-blue-500/30 focus:border-blue-500 focus:ring-2"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>
          )}
          <label className="block text-xs font-medium text-gray-600">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              className="mt-1 w-full min-h-11 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none ring-blue-500/30 focus:border-blue-500 focus:ring-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Password
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="••••••••"
              className="mt-1 w-full min-h-11 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none ring-blue-500/30 focus:border-blue-500 focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-11 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? (mode === "signin" ? "Signing in…" : "Creating account…") : (mode === "signin" ? "Sign in" : "Create account")}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-medium text-blue-600 hover:underline"
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
