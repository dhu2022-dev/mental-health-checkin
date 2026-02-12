/**
 * Shared background config for home and dashboard.
 * Structured for future user preference storage.
 * Custom images (upload or URL) stored in localStorage for now.
 */
export type HomeBackground =
  | { id: string; type: "gradient"; value: string; overlay?: number }
  | { id: string; type: "image"; value: string; overlay?: number };

const STORAGE_KEY = "mhc_custom_background";

export function getCustomBackground(): HomeBackground | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { value, overlay } = JSON.parse(raw) as { value: string; overlay?: number };
    if (typeof value === "string" && value)
      return { id: "custom", type: "image", value, overlay: overlay ?? 0.35 };
  } catch {
    /* ignore */
  }
  return null;
}

export function setCustomBackground(value: string, overlay?: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ value, overlay: overlay ?? 0.35 }));
  } catch {
    /* ignore */
  }
}

export function clearCustomBackground(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export const HOME_BACKGROUNDS: readonly HomeBackground[] = [
  {
    id: "dawn",
    type: "gradient",
    value:
      "linear-gradient(135deg, #fef3e2 0%, #d4a574 50%, #2c1810 100%)",
    overlay: 0.2,
  },
  {
    id: "ink",
    type: "gradient",
    value: "linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)",
    overlay: 0.3,
  },
  {
    id: "mist",
    type: "gradient",
    value:
      "linear-gradient(180deg, #e8e4df 0%, #c4bcb0 50%, #8b7355 100%)",
    overlay: 0.15,
  },
  {
    id: "zen",
    type: "image",
    value:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80",
    overlay: 0.4,
  },
] as const;

export function getAllBackgrounds(): HomeBackground[] {
  const custom = getCustomBackground();
  const base = [...HOME_BACKGROUNDS];
  if (custom) base.push(custom);
  return base;
}
