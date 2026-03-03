"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { HomeBackground } from "@/lib/home-backgrounds";

type BackgroundContextValue = {
  currentBgId: string | null;
  setBackground: (bg: HomeBackground) => void;
};

const BackgroundContext = createContext<BackgroundContextValue | null>(null);

export function useBackgroundContext() {
  const ctx = useContext(BackgroundContext);
  return ctx;
}

export function BackgroundProvider({
  value,
  children,
}: {
  value: BackgroundContextValue;
  children: ReactNode;
}) {
  return (
    <BackgroundContext.Provider value={value}>
      {children}
    </BackgroundContext.Provider>
  );
}
