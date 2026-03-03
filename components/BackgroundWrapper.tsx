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
      backgroundColor: "#1a1816",
    };
  }
  return {
    backgroundImage: `url(${bg.value}), linear-gradient(135deg, #1a1816 0%, #2a2520 25%, #252220 50%, #2a2520 75%, #1a1816 100%)`,
    backgroundSize: "cover, cover",
    backgroundPosition: "center, center",
    backgroundRepeat: "no-repeat, no-repeat",
    backgroundColor: "#1a1816",
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
    const customCount = customBackgrounds.length;
    const customJustAdded = customCount > prevCustomCountRef.current;
    prevCustomCountRef.current = customCount;

    const currentStillInList = bg && backgrounds.some((b) => b.id === bg.id);
    if (currentStillInList) {
      if (customJustAdded && customBackgrounds.length > 0) {
        setBg(customBackgrounds[0]);
      }
      return;
    }
    const i = Math.floor(Math.random() * backgrounds.length);
    setBg(backgrounds[i]);
  }, [backgrounds, hasFetched, bg]);

  const activeBg = bg ?? INK_PLACEHOLDER;
  const overlay = activeBg?.overlay ?? 0.3;

  const [fromBg, setFromBg] = useState(activeBg);
  const [toBg, setToBg] = useState(activeBg);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (activeBg.id === toBg.id) return;
    setFromBg(toBg);
    setToBg(activeBg);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsFading(true));
    });
    return () => cancelAnimationFrame(raf);
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
