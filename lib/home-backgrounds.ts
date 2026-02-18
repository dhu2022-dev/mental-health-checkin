/**
 * Background types. All backgrounds are now fetched from /api/background (DB).
 * This module only exports the type and a fallback for loading state.
 */
export type HomeBackground =
  | { id: string; type: "gradient"; value: string; overlay?: number }
  | { id: string; type: "image"; value: string; overlay?: number };

/** Fallback during loading (ink gradient) - matches API default */
export const INK_PLACEHOLDER: HomeBackground = {
  id: "ink",
  type: "gradient",
  value: "linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)",
  overlay: 0.3,
};
