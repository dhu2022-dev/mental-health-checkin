"use client";

import { useEffect, useState } from "react";
import { useAllBackgrounds } from "@/lib/use-backgrounds";
import type { HomeBackground } from "@/lib/home-backgrounds";

type Props = {
  children: React.ReactNode;
  /** If true, wrap children in a white rounded card; otherwise full-bleed content */
  contentBlock?: boolean;
};

export function BackgroundWrapper({ children, contentBlock = false }: Props) {
  const backgrounds = useAllBackgrounds();
  const [bg, setBg] = useState<HomeBackground | null>(null);

  useEffect(() => {
    if (backgrounds.length === 0) return;
    const i = Math.floor(Math.random() * backgrounds.length);
    setBg(backgrounds[i]);
  }, [backgrounds]);

  const activeBg = bg ?? backgrounds[0];
  const overlay = activeBg?.overlay ?? 0.3;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fixed viewport-filling background; gradient filler for widespace when image doesn't reach edges */}
      <div
        className="fixed inset-0 -z-10 w-screen h-screen"
        style={
          activeBg?.type === "gradient"
            ? { background: activeBg.value }
            : {
                background: activeBg?.type === "image"
                  ? `url(${activeBg.value}) center/cover no-repeat, linear-gradient(135deg, #1a1816 0%, #2a2520 25%, #252220 50%, #2a2520 75%, #1a1816 100%)`
                  : undefined,
                backgroundColor: "#1a1816",
              }
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
