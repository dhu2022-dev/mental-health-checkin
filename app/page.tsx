"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAllBackgrounds } from "@/lib/use-backgrounds";
import type { HomeBackground } from "@/lib/home-backgrounds";

export default function HomePage() {
  const backgrounds = useAllBackgrounds();
  const [bg, setBg] = useState<HomeBackground | null>(null);

  useEffect(() => {
    if (backgrounds.length === 0) return;
    const i = Math.floor(Math.random() * backgrounds.length);
    setBg(backgrounds[i]);
  }, [backgrounds]);

  const activeBg = bg ?? backgrounds[0];
  const overlay = activeBg.overlay ?? 0.3;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Full-bleed background */}
      <div
        className="absolute inset-0 -z-10"
        style={
          activeBg.type === "gradient"
            ? { background: activeBg.value }
            : {
                backgroundColor: "#1a1a1a",
                backgroundImage: `url(${activeBg.value})`,
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
