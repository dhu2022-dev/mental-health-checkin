/**
 * Background types. All backgrounds are now fetched from /api/background (DB).
 * This module only exports the type and a fallback for loading/empty state.
 */
export type HomeBackground =
  | { id: string; type: "gradient"; value: string; overlay?: number }
  | { id: string; type: "image"; value: string; overlay?: number };

/** Fallback when loading or when the gallery is empty - black gradient */
export const INK_PLACEHOLDER: HomeBackground = {
  id: "ink",
  type: "gradient",
  value: "linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)",
  overlay: 0.3,
};
