"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const BASE_GRADIENT =
  "linear-gradient(135deg, #020617 0%, #0f172a 40%, #0c4a6e 70%, #0f172a 100%)";
const TEAL_BREATH =
  "linear-gradient(135deg, transparent 0%, rgba(20, 184, 166, 0.4) 40%, rgba(6, 182, 212, 0.5) 60%, rgba(20, 184, 166, 0.4) 100%)";

/* 20 particles: underwater light motes. Sizes 6-12px (2× original), bluish-white, soft glow. 6-12s cycle. */
const PARTICLES = [
  { left: "14%", top: "22%", size: 8, dx: 6, dy: -28, wobble: 5, duration: 8000, delay: 0, glow: true },
  { left: "82%", top: "18%", size: 6, dx: -8, dy: -32, wobble: 4, duration: 9500, delay: 1200, glow: false },
  { left: "48%", top: "72%", size: 10, dx: 12, dy: -22, wobble: 6, duration: 7200, delay: 2800, glow: true },
  { left: "8%", top: "58%", size: 8, dx: -5, dy: -26, wobble: 5, duration: 8800, delay: 500, glow: true },
  { left: "68%", top: "45%", size: 6, dx: 3, dy: -30, wobble: 4, duration: 10200, delay: 3500, glow: false },
  { left: "32%", top: "38%", size: 8, dx: -10, dy: -24, wobble: 5, duration: 7500, delay: 1800, glow: false },
  { left: "88%", top: "75%", size: 6, dx: 7, dy: -28, wobble: 4, duration: 9200, delay: 4200, glow: false },
  { left: "52%", top: "12%", size: 12, dx: -6, dy: -26, wobble: 6, duration: 11000, delay: 2100, glow: true },
  { left: "22%", top: "82%", size: 8, dx: 9, dy: -20, wobble: 5, duration: 7800, delay: 1500, glow: true },
  { left: "75%", top: "8%", size: 6, dx: -4, dy: -34, wobble: 4, duration: 8600, delay: 4000, glow: false },
  { left: "38%", top: "52%", size: 8, dx: 8, dy: -25, wobble: 5, duration: 9400, delay: 6000, glow: false },
  { left: "5%", top: "38%", size: 6, dx: -7, dy: -29, wobble: 4, duration: 7000, delay: 800, glow: false },
  { left: "62%", top: "65%", size: 10, dx: 4, dy: -26, wobble: 6, duration: 10500, delay: 3200, glow: true },
  { left: "42%", top: "25%", size: 8, dx: -9, dy: -27, wobble: 5, duration: 8100, delay: 4500, glow: true },
  { left: "92%", top: "42%", size: 6, dx: 5, dy: -31, wobble: 4, duration: 9000, delay: 1200, glow: false },
  { left: "18%", top: "68%", size: 8, dx: -6, dy: -23, wobble: 5, duration: 7600, delay: 2500, glow: false },
  { left: "58%", top: "48%", size: 6, dx: 10, dy: -28, wobble: 4, duration: 9800, delay: 5000, glow: false },
  { left: "96%", top: "55%", size: 10, dx: -3, dy: -25, wobble: 6, duration: 8500, delay: 3800, glow: true },
  { left: "28%", top: "15%", size: 8, dx: 7, dy: -30, wobble: 5, duration: 7300, delay: 2800, glow: false },
  { left: "72%", top: "78%", size: 6, dx: -8, dy: -22, wobble: 4, duration: 10600, delay: 1600, glow: false },
];

const PARTICLE_MAX_OPACITY = 0.38;

function phaseToStyle(
  phase: number,
  drift: { dx: number; dy: number; wobble: number }
): { opacity: number; transform: string } {
  const { dx, dy, wobble } = drift;
  let opacity: number;
  let tx: number;
  let ty: number;
  if (phase < 0.06) {
    opacity = (phase / 0.06) * PARTICLE_MAX_OPACITY;
    tx = 0;
    ty = 0;
  } else if (phase < 0.65) {
    opacity = PARTICLE_MAX_OPACITY;
    const t = (phase - 0.06) / 0.59;
    const wobbleFactor = Math.sin(t * Math.PI);
    tx = dx * t + wobble * wobbleFactor;
    ty = dy * t + wobble * wobbleFactor * 0.15;
  } else if (phase < 1) {
    const fadePhase = (phase - 0.65) / 0.35;
    opacity = PARTICLE_MAX_OPACITY * (1 - fadePhase);
    tx = dx;
    ty = dy;
  } else {
    opacity = 0;
    tx = dx;
    ty = dy;
  }
  return { opacity, transform: `translate(${tx}px, ${ty}px)` };
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [particlePhases, setParticlePhases] = useState<number[]>(() =>
    PARTICLES.map(() => 0)
  );
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    const update = () => {
      const elapsed = Date.now() - startRef.current;
      setParticlePhases(() =>
        PARTICLES.map((p) => {
          const effective = Math.max(0, (elapsed - p.delay) / p.duration);
          return effective % 1;
        })
      );
    };
    update();
    const interval = setInterval(update, 50);
    return () => clearInterval(interval);
  }, []);

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
      {/* Ambient particles - underwater light motes: soft, bluish-white, plankton catching light */}
      {PARTICLES.map((p, i) => {
        const { opacity, transform } = phaseToStyle(particlePhases[i], {
          dx: p.dx,
          dy: p.dy,
          wobble: p.wobble,
        });
        const moteColor = "rgba(255, 255, 255, 0.95)";
        return (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none transition-none"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              zIndex: 1,
              opacity,
              transform,
              background: `radial-gradient(circle at center, ${moteColor} 0%, rgba(245,248,255,0.6) 50%, transparent 70%)`,
              boxShadow: p.glow
                ? `0 0 ${p.size * 3}px rgba(255,255,255,0.95), 0 0 ${p.size * 8}px rgba(250,252,255,0.9), 0 0 ${p.size * 14}px rgba(240,248,255,0.75)`
                : `0 0 ${p.size * 2}px rgba(255,255,255,0.9), 0 0 ${p.size * 6}px rgba(248,252,255,0.85), 0 0 ${p.size * 10}px rgba(240,248,255,0.7)`,
              filter: "blur(0.5px)",
            }}
          />
        );
      })}

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
