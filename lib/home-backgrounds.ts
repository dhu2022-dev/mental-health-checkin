/**
 * Shared background config for home and dashboard.
 * Custom images are stored in Supabase Storage; URL fetched from /api/background.
 */
export type HomeBackground =
  | { id: string; type: "gradient"; value: string; overlay?: number }
  | { id: string; type: "image"; value: string; overlay?: number };

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

export function getAllBackgrounds(customUrl: string | null): HomeBackground[] {
  const base = [...HOME_BACKGROUNDS];
  if (customUrl) {
    base.push({
      id: "custom",
      type: "image",
      value: customUrl,
      overlay: 0.35,
    });
  }
  return base;
}
