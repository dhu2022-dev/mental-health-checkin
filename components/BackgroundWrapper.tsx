"use client";

import { useEffect, useState, useRef } from "react";
import { useAllBackgrounds } from "@/lib/use-backgrounds";
import { INK_PLACEHOLDER, type HomeBackground } from "@/lib/home-backgrounds";

type Props = {
  children: React.ReactNode;
  /** If true, wrap children in a white rounded card; otherwise full-bleed content */
  contentBlock?: boolean;
};

export function BackgroundWrapper({ children, contentBlock = false }: Props) {
  const { backgrounds, hasFetched } = useAllBackgrounds();
  const [bg, setBg] = useState<HomeBackground | null>(null);
  const hadCustomRef = useRef(false);

  useEffect(() => {
    if (!hasFetched || backgrounds.length === 0) return;
    const hasCustom = backgrounds.some((b) => b.id === "custom");
    const customJustAdded = hasCustom && !hadCustomRef.current;
    hadCustomRef.current = hasCustom;

    const currentStillInList = bg && backgrounds.some((b) => b.id === bg.id);
    if (currentStillInList) {
      if (customJustAdded) {
        const customBg = backgrounds.find((b) => b.id === "custom");
        if (customBg) setBg(customBg);
      }
      return;
    }
    const i = Math.floor(Math.random() * backgrounds.length);
    setBg(backgrounds[i]);
  }, [backgrounds, hasFetched, bg]);

  const activeBg =
    bg ??
    (hasFetched && backgrounds.length > 0 ? backgrounds[0] : INK_PLACEHOLDER) ??
    INK_PLACEHOLDER;
  const overlay = activeBg?.overlay ?? 0.3;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fixed viewport-filling background; gradient filler for widespace when image doesn't reach edges */}
      <div
        className="fixed inset-0 -z-10 w-screen h-screen"
        style={
          activeBg?.type === "gradient"
            ? {
                backgroundImage: activeBg.value,
                backgroundColor: "#1a1816",
              }
            : activeBg?.type === "image"
              ? {
                  backgroundImage: `url(${activeBg.value}), linear-gradient(135deg, #1a1816 0%, #2a2520 25%, #252220 50%, #2a2520 75%, #1a1816 100%)`,
                  backgroundSize: "cover, cover",
                  backgroundPosition: "center, center",
                  backgroundRepeat: "no-repeat, no-repeat",
                  backgroundColor: "#1a1816",
                }
              : { backgroundColor: "#1a1816" }
        }
      />
      {/* Translucent overlay for readability */}
      <div
        className="fixed inset-0 -z-10 w-screen h-screen"
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
  );
}
