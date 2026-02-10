/**
 * Parse "Jan 12, 2026 at 9:00PM" (Shortcut default date format) to ISO string.
 */
export function parseShortcutDate(dateStr: string): Date | null {
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

export type ParsedCheckIn = {
  recorded_at: Date;
  mood: number;
  notes: string | null;
};

/**
 * Parse semicolon-separated line: "Jan 12, 2026 at 9:00PM; 8; Hang out with friends"
 */
export function parseSemicolonLine(raw: string): ParsedCheckIn | null {
  const parts = raw.split(";").map((p) => p.trim());
  if (parts.length < 2) return null;
  const [datePart, moodPart, ...noteParts] = parts;
  // Try to parse the date from the first segment; if it fails, fall back to "now"
  const parsedDate = parseShortcutDate(datePart);
  const recorded_at = parsedDate ?? new Date();
  const mood = parseInt(moodPart ?? "", 10);
  if (Number.isNaN(mood) || mood < 1 || mood > 10) return null;
  const notes = noteParts.length > 0 ? noteParts.join(";").trim() || null : null;
  return { recorded_at, mood, notes };
}
