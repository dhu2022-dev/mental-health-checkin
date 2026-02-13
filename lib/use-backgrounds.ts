"use client";

import { useEffect, useState, useCallback } from "react";
import { getAllBackgrounds, type HomeBackground } from "@/lib/home-backgrounds";

const REFRESH_EVENT = "mhc-backgrounds-refresh";

export function refreshBackgrounds() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(REFRESH_EVENT));
  }
}

export function useAllBackgrounds() {
  const [backgrounds, setBackgrounds] = useState<HomeBackground[]>(
    () => getAllBackgrounds(null)
  );

  const fetchBackgrounds = useCallback(() => {
    fetch("/api/background")
      .then((r) => r.json())
      .then((data: { url: string | null }) => {
        setBackgrounds(getAllBackgrounds(data.url ?? null));
      })
      .catch(() => setBackgrounds(getAllBackgrounds(null)));
  }, []);

  useEffect(() => {
    fetchBackgrounds();
    const handler = () => fetchBackgrounds();
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
  }, [fetchBackgrounds]);

  return backgrounds;
}
