"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

type Phase = "intro" | "smoke" | "quote" | "fadeOut" | "home";

const INTRO_DURATION_MS = 5500;
const SMOKE_DURATION_MS = 800;
const QUOTE_DURATION_MS = 4000;
const FADEOUT_DURATION_MS = 2000;
const INTRO_FADE_IN_MS = 1200;
const SMOKE_LEAD_MS = 1200;
const VIDEO_PAUSE_LEAD_MS = 300;
const QUOTE_LEAD_MS = 400;
const SMOKE_FADE_MS = 1200;

const EASE_SMOOTH = "cubic-bezier(0.25, 0.1, 0.25, 1)";

const INTRO_QUOTE = "Some nights you just need to slow down and breathe.";
const DASHBOARD_TRANSITION_MS = 500;

const HOME_GRADIENT =
  "linear-gradient(135deg, #1a1816 0%, #2a2520 25%, #252220 50%, #2a2520 75%, #1a1816 100%)";

const SKIP_STORAGE_KEY = "mhc_intro_skipped";

export default function HomePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase | "pending">("pending");
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [navigatingToDashboard, setNavigatingToDashboard] = useState(false);
  const [introFadedIn, setIntroFadedIn] = useState(false);
  const [homeLayerVisible, setHomeLayerVisible] = useState(false);
  const [smokeStarted, setSmokeStarted] = useState(false);
  const [quoteFadeStarted, setQuoteFadeStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const goHome = useCallback((fromSkip = false) => {
    if (fromSkip && typeof window !== "undefined") {
      sessionStorage.setItem(SKIP_STORAGE_KEY, "1");
    }
    setPhase("home");
  }, []);

  const handleOpenDashboard = useCallback(() => {
    setNavigatingToDashboard(true);
    setTimeout(() => router.push("/dashboard"), DASHBOARD_TRANSITION_MS);
  }, [router]);

  useEffect(() => {
    const skipped = typeof window !== "undefined" ? sessionStorage.getItem(SKIP_STORAGE_KEY) : null;
    setPhase(skipped === "1" ? "home" : "intro");
  }, []);

  useEffect(() => {
    if (phase === "smoke" || phase === "quote" || phase === "fadeOut") {
      videoRef.current?.pause();
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "intro") return;
    setIntroFadedIn(false);
    setSmokeStarted(false);
    const t1 = setTimeout(() => setIntroFadedIn(true), 10);
    const playAt = INTRO_FADE_IN_MS * 0.8;
    const t2 = setTimeout(() => videoRef.current?.play(), playAt);
    const smokeLead = Math.max(0, INTRO_DURATION_MS - SMOKE_LEAD_MS);
    const t3 = setTimeout(() => setSmokeStarted(true), smokeLead);
    const pauseLead = Math.max(0, INTRO_DURATION_MS - VIDEO_PAUSE_LEAD_MS);
    const t4 = setTimeout(() => videoRef.current?.pause(), pauseLead);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "smoke") return;
    setQuoteFadeStarted(false);
    const t = setTimeout(() => setQuoteFadeStarted(true), QUOTE_LEAD_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "intro" && phase !== "smoke" && phase !== "quote" && phase !== "fadeOut") return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    if (phase === "intro") {
      if (videoLoaded) {
        timers.push(setTimeout(() => setPhase("smoke"), INTRO_DURATION_MS));
      } else {
        timers.push(setTimeout(() => setPhase("smoke"), 12000));
      }
    } else if (phase === "smoke") {
      timers.push(setTimeout(() => setPhase("quote"), SMOKE_DURATION_MS));
    } else if (phase === "quote") {
      timers.push(setTimeout(() => setPhase("fadeOut"), QUOTE_DURATION_MS));
    } else if (phase === "fadeOut") {
      timers.push(setTimeout(() => goHome(false), FADEOUT_DURATION_MS));
    }

    return () => timers.forEach(clearTimeout);
  }, [phase, goHome, videoLoaded]);

  useEffect(() => {
    if (phase !== "intro") setSmokeStarted(false);
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
          style={{ background: HOME_GRADIENT, backgroundColor: "#1a1816" }}
        />
      </main>
    );
  }

  const homeContentInner = (
    <>
      <div
        className="fixed inset-0 -z-10 w-screen h-screen"
        style={{ background: HOME_GRADIENT, backgroundColor: "#1a1816" }}
      />
      <div
        className="fixed inset-0 -z-10 w-screen h-screen"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.25)" }}
      />
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

  const showIntro = phase === "intro" || phase === "smoke" || phase === "quote" || phase === "fadeOut";
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
          <>
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
                onLoadedData={() => setVideoLoaded(true)}
              />
            </div>

            {/* Smoke overlay - overlaps with intro (last 1.2s), stretches over 1.2s */}
            <div
              className="absolute inset-0 -z-10 w-screen h-screen pointer-events-none transition-opacity"
              style={{
                opacity:
                  phase === "quote" || phase === "fadeOut"
                    ? 1
                    : phase === "smoke" || (phase === "intro" && smokeStarted)
                      ? 0.9
                      : 0,
                transitionDuration: `${SMOKE_FADE_MS}ms`,
                transitionTimingFunction: EASE_SMOOTH,
                background:
                  "radial-gradient(ellipse at center, rgba(45,40,50,0.4) 0%, rgba(26,22,28,0.85) 50%, rgba(18,16,18,0.98) 100%)",
              }}
            />

            {/* Quote layer - overlaps with smoke (starts 400ms into smoke phase) */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity"
              style={{
                opacity: phase === "quote" || (phase === "smoke" && quoteFadeStarted) ? 1 : 0,
                transitionDuration: "2500ms",
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
              onClick={() => goHome(true)}
              className="fixed top-4 right-4 px-3 py-1.5 rounded text-sm text-white/80 hover:text-white hover:bg-white/10 transition z-10"
            >
              Skip
            </button>
          </>
        )}
      </div>
    </main>
  );
}
