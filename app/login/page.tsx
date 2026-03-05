"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const BASE_GRADIENT =
  "linear-gradient(135deg, #020617 0%, #0f172a 40%, #0c4a6e 70%, #0f172a 100%)";
const TEAL_BREATH =
  "linear-gradient(135deg, transparent 0%, rgba(20, 184, 166, 0.4) 40%, rgba(6, 182, 212, 0.5) 60%, rgba(20, 184, 166, 0.4) 100%)";

const PARTICLE_POSITIONS = [
  { left: "12%", top: "23%" },
  { left: "78%", top: "15%" },
  { left: "45%", top: "72%" },
  { left: "88%", top: "55%" },
  { left: "8%", top: "68%" },
  { left: "62%", top: "12%" },
  { left: "35%", top: "45%" },
  { left: "92%", top: "82%" },
];

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

      {/* Base gradient - deep navy */}
      <div
        className="absolute inset-0"
        style={{ background: BASE_GRADIENT, zIndex: -10 }}
      />
      {/* Breathing teal overlay - 14s cycle */}
      <div
        className="absolute inset-0 pointer-events-none animate-breathe"
        style={{ background: TEAL_BREATH, zIndex: 0 }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.18)", zIndex: 0 }}
      />
      {/* Very subtle noise texture - feTurbulence gives organic grain */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0, opacity: 0.018 }}
        aria-hidden
      >
        <filter id="login-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="4"
            seed="1"
            result="noise"
          />
          <feColorMatrix in="noise" type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#login-noise)" />
      </svg>
      {/* Ambient particles */}
      {PARTICLE_POSITIONS.map((pos, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-white/40 pointer-events-none animate-float"
          style={{
            left: pos.left,
            top: pos.top,
            zIndex: 0,
            animationDelay: `${i * 2.5}s`,
            animationDuration: `${18 + i * 2}s`,
          }}
        />
      ))}

      <div className="relative z-10 w-full max-w-sm">
        <div className="rounded-2xl bg-white/[0.07] backdrop-blur-xl border border-white/10 p-8 shadow-2xl shadow-black/20">
          <h1 className="text-2xl font-semibold text-white mb-1 drop-shadow">
            Sign in
          </h1>
          <p className="text-slate-300/90 text-sm mb-6 drop-shadow">
            Your space to check in
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
            style={{ background: BASE_GRADIENT, zIndex: -1 }}
          />
          <p className="relative z-10 text-stone-300">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
