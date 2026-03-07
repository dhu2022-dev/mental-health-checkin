"use client";

import { useEffect, useState, useRef } from "react";
import { useAllBackgrounds } from "@/lib/use-backgrounds";
import { INK_PLACEHOLDER, type HomeBackground } from "@/lib/home-backgrounds";
import { BackgroundProvider } from "@/lib/background-context";

const FADE_MS = 600;

function bgLayerStyle(bg: HomeBackground): React.CSSProperties {
  if (bg.type === "gradient") {
    return {
      backgroundImage: bg.value,
      backgroundColor: "#020617",
    };
  }
  return {
    backgroundImage: `url(${bg.value}), linear-gradient(135deg, #020617 0%, #0a0f1a 25%, #0f172a 50%, #0a0f1a 75%, #020617 100%)`,
    backgroundSize: "cover, cover",
    backgroundPosition: "center, center",
    backgroundRepeat: "no-repeat, no-repeat",
    backgroundColor: "#020617",
  };
}

type Props = {
  children: React.ReactNode;
  /** If true, wrap children in a white rounded card; otherwise full-bleed content */
  contentBlock?: boolean;
};

export function BackgroundWrapper({ children, contentBlock = false }: Props) {
  const { backgrounds, hasFetched } = useAllBackgrounds();
  const [bg, setBg] = useState<HomeBackground | null>(null);
  const prevCustomCountRef = useRef(0);

  const contextValue = {
    currentBgId: bg?.id ?? null,
    setBackground: setBg,
  };

  useEffect(() => {
    if (!hasFetched || backgrounds.length === 0) return;

    const customBackgrounds = backgrounds.filter((b) => b.id.startsWith("custom_"));
    const prevCount = prevCustomCountRef.current;
    prevCustomCountRef.current = customBackgrounds.length;
    const customJustAdded = prevCount > 0 && customBackgrounds.length > prevCount;

    const currentInList = bg && backgrounds.some((b) => b.id === bg.id);

    // Upload: use newest (first user-uploaded; zen is excluded via overlay)
    if (customJustAdded && customBackgrounds.length > 0) {
      const newest = customBackgrounds.find((b) => b.overlay === 0.35) ?? customBackgrounds[0];
      setBg(newest);
      return;
    }

    // Removed: current no longer in list → pick random
    if (bg && !currentInList) {
      const i = Math.floor(Math.random() * backgrounds.length);
      setBg(backgrounds[i]);
      return;
    }

    // Initial load: no selection yet → pick random
    if (!bg) {
      const i = Math.floor(Math.random() * backgrounds.length);
      setBg(backgrounds[i]);
    }
    // User selected from gallery: keep current (handled by setBackground in context)
  }, [backgrounds, hasFetched, bg]);

  const activeBg = bg ?? INK_PLACEHOLDER;
  const overlay = activeBg?.overlay ?? 0.3;

  const [fromBg, setFromBg] = useState(activeBg);
  const [toBg, setToBg] = useState(activeBg);
  const [isFading, setIsFading] = useState(false);
  const activeBgRef = useRef(activeBg);
  activeBgRef.current = activeBg;

  useEffect(() => {
    if (activeBg.id === toBg.id) return;

    const runTransition = () => {
      setFromBg(toBg);
      setToBg(activeBg);
      let innerRaf = 0;
      const outerRaf = requestAnimationFrame(() => {
        innerRaf = requestAnimationFrame(() => setIsFading(true));
      });
      return () => {
        cancelAnimationFrame(outerRaf);
        if (innerRaf) cancelAnimationFrame(innerRaf);
      };
    };

    if (activeBg.type === "image") {
      const targetId = activeBg.id;
      const currentToBg = toBg;
      const img = new Image();
      img.onload = img.onerror = () => {
        if (activeBgRef.current.id !== targetId) return;
        setFromBg(currentToBg);
        setToBg(activeBgRef.current);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setIsFading(true));
        });
      };
      img.src = activeBg.value;
      return;
    }

    return runTransition();
  }, [activeBg]);

  const handleTransitionEnd = () => {
    if (!isFading) return;
    setIsFading(false);
    setFromBg(activeBg);
  };

  const isDifferent = fromBg.id !== toBg.id;
  const showFrom = fromBg.id === toBg.id || !isFading;
  const showTo = isDifferent && isFading;
  const isSettled = fromBg.id === toBg.id;
  const transitionStyle = isSettled
    ? { transition: "none" as const }
    : {
        transitionDuration: `${FADE_MS}ms`,
        transitionTimingFunction: "ease-in-out" as const,
      };

  return (
    <BackgroundProvider value={contextValue}>
    <div className="min-h-screen relative overflow-hidden">
      {/* Two-layer crossfade: from (fading out) and to (fading in) */}
      <div
        className="fixed inset-0 -z-10 w-screen h-screen transition-opacity"
        style={{
          ...bgLayerStyle(fromBg),
          opacity: showFrom ? 1 : 0,
          ...transitionStyle,
        }}
        aria-hidden
      />
      <div
        className="fixed inset-0 -z-10 w-screen h-screen transition-opacity"
        style={{
          ...bgLayerStyle(toBg),
          opacity: showTo ? 1 : 0,
          ...transitionStyle,
        }}
        onTransitionEnd={handleTransitionEnd}
        aria-hidden
      />
      {/* Translucent overlay for readability */}
      <div
        className="fixed inset-0 -z-10 w-screen h-screen pointer-events-none"
        style={{ backgroundColor: `rgba(0, 0, 0, ${overlay})` }}
      />
      {contentBlock ? (
        <div className="min-h-screen flex flex-col items-center p-6">
          <div className="w-full max-w-4xl flex-1 mt-8 mb-8">
            <div className="rounded-xl bg-white/95 backdrop-blur-sm shadow-xl p-6 sm:p-8">
              {children}
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
    </BackgroundProvider>
  );
}
