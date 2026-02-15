"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Phase = "intro" | "smoke" | "quote" | "fadeOut" | "home";

const INTRO_DURATION_MS = 7000;
const SMOKE_DURATION_MS = 1500;
const QUOTE_DURATION_MS = 4000;
const FADEOUT_DURATION_MS = 1500;

const INTRO_QUOTE = "Every breath is a chance to begin again.";

const HOME_GRADIENT =
  "linear-gradient(135deg, #1a1816 0%, #2a2520 25%, #252220 50%, #2a2520 75%, #1a1816 100%)";

const SKIP_STORAGE_KEY = "mhc_intro_skipped";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export default function HomePage() {
  const [phase, setPhase] = useState<Phase | "pending">("pending");
  const reducedMotion = useReducedMotion();

  const goHome = useCallback((fromSkip = false) => {
    if (fromSkip && typeof window !== "undefined") {
      sessionStorage.setItem(SKIP_STORAGE_KEY, "1");
    }
    setPhase("home");
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setPhase("home");
      return;
    }
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    if (params?.get("intro") === "1") {
      setPhase("intro");
      return;
    }
    const skipped = typeof window !== "undefined" ? sessionStorage.getItem(SKIP_STORAGE_KEY) : null;
    if (skipped === "1") {
      setPhase("home");
      return;
    }
    setPhase("intro");
  }, [reducedMotion]);

  useEffect(() => {
    if (phase !== "intro" && phase !== "smoke" && phase !== "quote" && phase !== "fadeOut") return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    if (phase === "intro") {
      timers.push(setTimeout(() => setPhase("smoke"), INTRO_DURATION_MS));
    } else if (phase === "smoke") {
      timers.push(setTimeout(() => setPhase("quote"), SMOKE_DURATION_MS));
    } else if (phase === "quote") {
      timers.push(setTimeout(() => setPhase("fadeOut"), QUOTE_DURATION_MS));
    } else if (phase === "fadeOut") {
      timers.push(setTimeout(() => goHome(false), FADEOUT_DURATION_MS));
    }

    return () => timers.forEach(clearTimeout);
  }, [phase, goHome]);

  if (phase === "pending") {
    return (
      <main className="min-h-screen">
        <div
          className="fixed inset-0 -z-10 w-screen h-screen"
          style={{ background: HOME_GRADIENT, backgroundColor: "#1a1816" }}
        />
      </main>
    );
  }

  if (phase === "home") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div
          className="fixed inset-0 -z-10 w-screen h-screen"
          style={{ background: HOME_GRADIENT, backgroundColor: "#1a1816" }}
        />
        <div
          className="fixed inset-0 -z-10 w-screen h-screen"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.25)" }}
        />
        <h1 className="text-2xl font-semibold text-white mb-4 drop-shadow">
          Mental Health Check-in
        </h1>
        <p className="text-stone-200 mb-8 text-center max-w-md drop-shadow">
          Track your daily mood and review insights over time.
        </p>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 rounded-lg bg-white/90 text-stone-800 font-medium hover:bg-white transition"
        >
          Open dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* GIF layer */}
      <div className="fixed inset-0 -z-20 w-screen h-screen">
        <img
          src="/intro-cinematic.gif"
          alt=""
          className="w-full h-full object-cover object-center"
          style={{ imageRendering: "auto" }}
        />
      </div>

      {/* Smoke overlay - animates in during smoke phase, full cover for quote/fadeOut */}
      <div
        className="fixed inset-0 -z-10 w-screen h-screen pointer-events-none transition-opacity duration-[1500ms] ease-out"
        style={{
          opacity:
            phase === "intro"
              ? 0
              : phase === "smoke"
                ? 0.9
                : 1,
          background:
            "radial-gradient(ellipse at center, rgba(45,40,50,0.4) 0%, rgba(26,22,28,0.85) 50%, rgba(18,16,18,0.98) 100%)",
        }}
      />

      {/* Quote layer - fades in during quote, out during fadeOut */}
      <div
        className="fixed inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-500"
        style={{
          opacity:
            phase === "quote"
              ? 1
              : phase === "fadeOut"
                ? 0
                : 0,
        }}
      >
        <p className="text-xl sm:text-2xl text-white/95 text-center max-w-lg px-8 font-light italic drop-shadow-lg">
          {INTRO_QUOTE}
        </p>
      </div>

      {/* Skip button */}
      <button
        type="button"
        onClick={() => goHome(true)}
        className="fixed top-4 right-4 px-3 py-1.5 rounded text-sm text-white/80 hover:text-white hover:bg-white/10 transition z-10"
      >
        Skip
      </button>
    </main>
  );
}
