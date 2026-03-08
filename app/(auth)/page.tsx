"use client";

import { useEffect, useLayoutEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useVideoConductor } from "@/lib/use-video-conductor";
import { IntroErrorBoundary } from "@/components/IntroErrorBoundary";

type Phase = "intro" | "vignette" | "quote" | "fadeOut" | "home";

/** Base: vignette fade duration. Other phases derive from this to keep proportions. */
const VIGNETTE_FADE_MS = 2500;
const QUOTE_LEAD_BEFORE_VIGNETTE_END_MS = 1000;

const VIGNETTE_DURATION_MS = VIGNETTE_FADE_MS;
const QUOTE_LEAD_MS = Math.max(0, VIGNETTE_DURATION_MS - QUOTE_LEAD_BEFORE_VIGNETTE_END_MS);
const QUOTE_FADE_MS = VIGNETTE_FADE_MS;
const QUOTE_LINGER_MS = 900;
const QUOTE_DURATION_MS =
  (QUOTE_FADE_MS - (VIGNETTE_DURATION_MS - QUOTE_LEAD_MS)) + QUOTE_LINGER_MS;
const VIGNETTE_FALLBACK_MS = VIGNETTE_DURATION_MS + 700;
const FADEOUT_DURATION_MS = 2800;
const INTRO_FADE_IN_MS = 1200;
const INTRO_PLAY_AT_MS = 960; // 80% through fade-in

/** Video-time thresholds (seconds from play start). */
const VIDEO_VIGNETTE_S = 3.34;
const VIDEO_PAUSE_AND_PHASE_S = 4.24; // Pause and transition to vignette phase (can't fire after pause—video stops)

const EASE_SMOOTH = "cubic-bezier(0.25, 0.1, 0.25, 1)";
const INTRO_QUOTE = "Some nights you just need to slow down and breathe.";
const DASHBOARD_TRANSITION_MS = 500;

/** Dark cool theme – tangent with login navy; unifies pending, home, intro */
const HOME_GRADIENT =
  "linear-gradient(135deg, #020617 0%, #0a0f1a 20%, #0f172a 40%, #152238 50%, #0f172a 60%, #0a0f1a 80%, #020617 100%)";

/** Set to true and check browser console (F12) to trace phase flow when animation hangs. */
const DEBUG_INTRO = false;
const log = DEBUG_INTRO ? (...args: unknown[]) => console.log("[intro]", ...args) : () => {};

export default function HomePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase | "pending">("pending");
  const [navigatingToDashboard, setNavigatingToDashboard] = useState(false);
  const [introFadedIn, setIntroFadedIn] = useState(false);
  const [homeLayerVisible, setHomeLayerVisible] = useState(false);
  const [vignetteStarted, setVignetteStarted] = useState(false);
  const [quoteFadeStarted, setQuoteFadeStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { isReady, start } = useVideoConductor(videoRef, {
    enabled: phase === "intro",
    thresholds: [
      { seconds: VIDEO_VIGNETTE_S, callback: () => { log("conductor: vignette"); setVignetteStarted(true); } },
      {
        seconds: VIDEO_PAUSE_AND_PHASE_S,
        callback: () => {
          log("conductor: pause + phase → vignette");
          videoRef.current?.pause();
          setPhase("vignette");
        },
      },
    ],
  });

  const goHome = useCallback(() => {
    setPhase("home");
  }, []);

  const handleOpenDashboard = useCallback(() => {
    setNavigatingToDashboard(true);
    setTimeout(() => router.push("/dashboard"), DASHBOARD_TRANSITION_MS);
  }, [router]);

  useEffect(() => {
    log("initial phase: intro");
    setPhase("intro");
  }, []);

  useEffect(() => {
    if (phase === "vignette" || phase === "quote" || phase === "fadeOut") {
      videoRef.current?.pause();
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "intro") return;
    setIntroFadedIn(false);
    setVignetteStarted(false);
    if (!isReady) return;
    log("intro: isReady, scheduling fade-in + play at", INTRO_PLAY_AT_MS, "ms");
    const t1 = setTimeout(() => { log("intro: fade-in"); setIntroFadedIn(true); }, 10);
    const t2 = setTimeout(() => { log("intro: start video"); start(); }, INTRO_PLAY_AT_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase, isReady, start]);

  useEffect(() => {
    if (phase !== "vignette") return;
    setQuoteFadeStarted(false);
    const t = setTimeout(() => setQuoteFadeStarted(true), QUOTE_LEAD_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useLayoutEffect(() => {
    if (phase !== "vignette" && phase !== "quote" && phase !== "fadeOut") return;
    log("phase effect:", phase, "setting timers");
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (phase === "vignette") {
      timers.push(setTimeout(() => { log("timer: vignette → quote"); setPhase("quote"); }, VIGNETTE_DURATION_MS));
      timers.push(setTimeout(() => { log("timer: fallback vignette → quote"); setPhase((p) => (p === "vignette" ? "quote" : p)); }, VIGNETTE_FALLBACK_MS));
    } else if (phase === "quote") {
      timers.push(setTimeout(() => { log("timer: quote → fadeOut"); setPhase("fadeOut"); }, QUOTE_DURATION_MS));
    } else if (phase === "fadeOut") {
      timers.push(setTimeout(() => { log("timer: fadeOut → home"); goHome(); }, FADEOUT_DURATION_MS));
    }
    return () => { log("phase effect cleanup:", phase); timers.forEach(clearTimeout); };
  }, [phase, goHome]);

  useEffect(() => {
    if (phase !== "intro") setVignetteStarted(false);
  }, [phase]);

  useEffect(() => {
    if (phase === "fadeOut") {
      setHomeLayerVisible(false);
      const t = setTimeout(() => setHomeLayerVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setHomeLayerVisible(false);
    }
  }, [phase]);

  if (phase === "pending") {
    return (
      <main className="min-h-screen">
        <div
          className="fixed inset-0 -z-10 w-screen h-screen"
          style={{ background: HOME_GRADIENT, backgroundColor: "#020617" }}
        />
      </main>
    );
  }

  const homeContentInner = (
    <>
      <div
        className="fixed inset-0 -z-10 w-screen h-screen"
        style={{ background: HOME_GRADIENT, backgroundColor: "#020617" }}
      />
      <div
        className="fixed inset-0 -z-10 w-screen h-screen"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.25)" }}
      />
      <form
        action="/api/auth/logout"
        method="POST"
        className="fixed top-4 right-4 z-20"
      >
        <button
          type="submit"
          className="px-3 py-1.5 rounded text-sm text-white/80 hover:text-white hover:bg-white/10 transition"
        >
          Sign out
        </button>
      </form>
      <h1 className="text-2xl font-semibold text-white mb-4 drop-shadow">
        Take a moment to Check-in
      </h1>
      <p className="text-stone-200 mb-8 text-center max-w-md drop-shadow">
        Track your daily mood and review insights over time here.
      </p>
      <button
        type="button"
        onClick={handleOpenDashboard}
        className="px-5 py-2.5 rounded-lg bg-white/90 text-stone-800 font-medium hover:bg-white transition"
      >
        Open dashboard
      </button>
    </>
  );

  if (phase === "home") {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden transition-opacity duration-500"
        style={{
          opacity: navigatingToDashboard ? 0 : 1,
          transitionTimingFunction: EASE_SMOOTH,
        }}
      >
        {homeContentInner}
      </main>
    );
  }

  const showIntro = phase === "intro" || phase === "vignette" || phase === "quote" || phase === "fadeOut";
  const isFadeOut = phase === "fadeOut";

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Home layer - only rendered during fadeOut, fades in for crossfade */}
      {isFadeOut && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center p-8 transition-opacity z-0"
          style={{
            opacity: navigatingToDashboard ? 0 : homeLayerVisible ? 1 : 0,
            transitionDuration: navigatingToDashboard ? `${DASHBOARD_TRANSITION_MS}ms` : `${FADEOUT_DURATION_MS}ms`,
            transitionTimingFunction: EASE_SMOOTH,
            pointerEvents: !navigatingToDashboard ? "auto" : "none",
          }}
        >
          {homeContentInner}
        </div>
      )}

      {/* Intro layer - fades in, then fades out during fadeOut */}
      <div
        className="fixed inset-0 z-10 transition-opacity"
        style={{
          opacity: isFadeOut ? 0 : introFadedIn ? 1 : 0,
          transitionDuration: introFadedIn ? `${FADEOUT_DURATION_MS}ms` : `${INTRO_FADE_IN_MS}ms`,
          transitionTimingFunction: EASE_SMOOTH,
          pointerEvents: isFadeOut ? "none" : "auto",
        }}
      >
        {showIntro && (
          <IntroErrorBoundary onFallback={() => goHome()}>
            {/* Video layer - paused at first frame until 80% through fade-in */}
            <div className="absolute inset-0 -z-20 w-screen h-screen">
              <video
                ref={videoRef}
                src="/faye2.mp4"
                muted
                loop
                playsInline
                preload="auto"
                className="w-full h-full object-cover object-center"
              />
            </div>

            {/* Vignette overlay - radial gradient dims video, fades in over VIGNETTE_FADE_MS */}
            <div
              className="absolute inset-0 -z-10 w-screen h-screen pointer-events-none transition-opacity"
              style={{
                opacity:
                  phase === "quote" || phase === "fadeOut"
                    ? 1
                    : phase === "vignette" || (phase === "intro" && vignetteStarted)
                      ? 0.95
                      : 0,
                transitionDuration: `${VIGNETTE_FADE_MS}ms`,
                transitionTimingFunction: EASE_SMOOTH,
                background:
                  "radial-gradient(ellipse at center, rgba(30,25,35,0.6) 0%, rgba(15,12,18,0.95) 50%, rgba(5,5,8,1) 100%)",
              }}
            />

            {/* Quote layer - starts 1s before vignette phase ends */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity"
              style={{
                opacity: phase === "quote" || phase === "fadeOut" || (phase === "vignette" && quoteFadeStarted) ? 1 : 0,
                transitionDuration: `${QUOTE_FADE_MS}ms`,
                transitionTimingFunction: EASE_SMOOTH,
              }}
            >
              <p className="text-xl sm:text-2xl text-white/95 text-center max-w-lg px-8 font-light italic drop-shadow-lg">
                {INTRO_QUOTE}
              </p>
            </div>

            {/* Skip button */}
            <button
              type="button"
              onClick={() => goHome()}
              className="fixed top-4 right-4 px-3 py-1.5 rounded text-sm text-white/80 hover:text-white hover:bg-white/10 transition z-10"
            >
              Skip
            </button>
          </IntroErrorBoundary>
        )}
      </div>
    </main>
  );
}
