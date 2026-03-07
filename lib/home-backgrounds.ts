/**
 * Background types. All backgrounds are now fetched from /api/background (DB).
 * This module only exports the type and a fallback for loading/empty state.
 */
export type HomeBackground =
  | { id: string; type: "gradient"; value: string; overlay?: number }
  | { id: string; type: "image"; value: string; overlay?: number };

/** Fallback when loading or when the gallery is empty - dark navy, tangent with login */
export const INK_PLACEHOLDER: HomeBackground = {
  id: "ink",
  type: "gradient",
  value: "linear-gradient(180deg, #020617 0%, #0f172a 50%, #020617 100%)",
  overlay: 0.3,
};
