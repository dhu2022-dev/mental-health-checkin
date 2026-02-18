"use client";

import { useEffect, useState, useCallback } from "react";
import type { HomeBackground } from "@/lib/home-backgrounds";

const REFRESH_EVENT = "mhc-backgrounds-refresh";

export function refreshBackgrounds() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(REFRESH_EVENT));
  }
}

export function useAllBackgrounds(): {
  backgrounds: HomeBackground[];
  hasFetched: boolean;
} {
  const [state, setState] = useState<{
    backgrounds: HomeBackground[];
    hasFetched: boolean;
  }>(() => ({
    backgrounds: [],
    hasFetched: false,
  }));

  const fetchBackgrounds = useCallback(() => {
    fetch("/api/background")
      .then((r) => r.json())
      .then((data: { backgrounds?: HomeBackground[]; hasFetched?: boolean }) => {
        setState({
          backgrounds: data.backgrounds ?? [],
          hasFetched: data.hasFetched ?? true,
        });
      })
      .catch(() => {
        setState({ backgrounds: [], hasFetched: true });
      });
  }, []);

  useEffect(() => {
    fetchBackgrounds();
    const handler = () => fetchBackgrounds();
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
  }, [fetchBackgrounds]);

  return { backgrounds: state.backgrounds, hasFetched: state.hasFetched };
}
