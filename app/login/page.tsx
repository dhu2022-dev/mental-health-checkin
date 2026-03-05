"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LOGIN_GRADIENT =
  "linear-gradient(135deg, #020617 0%, #0f172a 25%, #0c4a6e 50%, #0f172a 75%, #020617 100%)";
const GLOW_COLOR = "rgba(34, 211, 238, 0.08)";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message);
        return;
      }
      router.push(redirect);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Base gradient - dark ocean */}
      <div
        className="absolute inset-0"
        style={{ background: LOGIN_GRADIENT, zIndex: -10 }}
      />
      {/* Soft cyan glow - on top of gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${GLOW_COLOR} 0%, transparent 60%)`,
          zIndex: 0,
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.2)", zIndex: 0 }}
      />
      <div className="relative z-10 w-full max-w-sm">
        <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-8 shadow-xl shadow-black/30">
          <h1 className="text-2xl font-semibold text-white mb-2 drop-shadow">
            Sign in
          </h1>
          <p className="text-stone-300 text-sm mb-6 drop-shadow">
            Take a moment for yourself.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm text-stone-200 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-600/40 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm text-stone-200 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-600/40 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-sm text-amber-400/90">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-lg bg-white/90 text-stone-800 font-medium hover:bg-white transition disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-transparent shadow-lg shadow-black/20"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center relative">
          <div
            className="absolute inset-0"
            style={{ background: LOGIN_GRADIENT, zIndex: -1 }}
          />
          <p className="relative z-10 text-stone-300">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
