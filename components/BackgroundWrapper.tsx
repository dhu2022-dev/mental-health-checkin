"use client";

import { useEffect, useState } from "react";
import { getAllBackgrounds, type HomeBackground } from "@/lib/home-backgrounds";

type Props = {
  children: React.ReactNode;
  /** If true, wrap children in a white rounded card; otherwise full-bleed content */
  contentBlock?: boolean;
};

export function BackgroundWrapper({ children, contentBlock = false }: Props) {
  const [bg, setBg] = useState<HomeBackground | null>(null);

  useEffect(() => {
    const all = getAllBackgrounds();
    const i = Math.floor(Math.random() * all.length);
    setBg(all[i]);
  }, []);

  const activeBg = bg ?? getAllBackgrounds()[0];
  const overlay = activeBg?.overlay ?? 0.3;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Full-bleed background */}
      <div
        className="absolute inset-0 -z-10"
        style={
          activeBg?.type === "gradient"
            ? { background: activeBg.value }
            : {
                backgroundImage: activeBg ? `url(${activeBg.value})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
        }
      />
      {/* Translucent overlay for readability */}
      <div
        className="absolute inset-0 -z-10"
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
