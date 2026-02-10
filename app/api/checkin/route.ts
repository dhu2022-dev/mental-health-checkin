import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import {
  parseShortcutDate,
  parseSemicolonLine,
} from "@/lib/parse-checkin";

function getApiKey(req: NextRequest): string | null {
  const header =
    req.headers.get("x-api-key") ?? req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return header?.trim() ?? req.nextUrl.searchParams.get("key") ?? null;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.CHECKIN_API_KEY;
  if (apiKey) {
    const provided = getApiKey(req);
    if (provided !== apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let recorded_at: Date;
  let mood: number;
  let notes: string | null = null;

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await req.json();
    if (body.raw && typeof body.raw === "string") {
      const parsed = parseSemicolonLine(body.raw);
      if (!parsed) {
        return NextResponse.json(
          { error: "Invalid raw format: expected 'date; mood; notes'" },
          { status: 400 }
        );
      }
      recorded_at = parsed.recorded_at;
      mood = parsed.mood;
      notes = parsed.notes;
    } else {
      // Shortcuts may send "Mood", "Score", or "mood"; value can be number, string, or object {}
      const moodInput =
        body.mood ?? body.Mood ?? body.score ?? body.Score;
      let moodVal: number;
      if (typeof moodInput === "number") {
        moodVal = moodInput;
      } else if (typeof moodInput === "object" && moodInput !== null) {
        // Shortcuts sometimes serializes number as {} or { value: N }; try to unwrap
        const unwrapped =
          (moodInput as { value?: number; amount?: number; number?: number }).value ??
          (moodInput as { value?: number }).amount ??
          (moodInput as { number?: number }).number ??
          Object.values(moodInput)[0];
        moodVal =
          typeof unwrapped === "number"
            ? unwrapped
            : parseInt(String(unwrapped ?? "").trim(), 10);
      } else {
        moodVal = parseInt(String(moodInput ?? "").trim(), 10);
      }
      if (Number.isNaN(moodVal) || moodVal < 1 || moodVal > 10) {
        return NextResponse.json(
          {
            error: "Invalid body: need mood (1-10) and optional date, notes",
            received: {
              keys: Object.keys(body),
              mood: body.mood ?? body.Mood ?? body.score,
            },
          },
          { status: 400 }
        );
      }
      mood = moodVal;
      const notesInput = body.notes ?? body.Notes ?? body.note;
      notes =
        typeof notesInput === "string" ? notesInput.trim() || null : null;
      const dateInput = body.date ?? body.Date;
      if (dateInput != null && typeof dateInput === "string") {
        const d = parseShortcutDate(dateInput);
        recorded_at = d ?? new Date();
      } else {
        recorded_at = new Date();
      }
    }
  } else if (contentType.includes("text/plain")) {
    const raw = await req.text();
    const parsed = parseSemicolonLine(raw);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid format: expected 'date; mood; notes'" },
        { status: 400 }
      );
    }
    recorded_at = parsed.recorded_at;
    mood = parsed.mood;
    notes = parsed.notes;
  } else {
    return NextResponse.json(
      { error: "Content-Type must be application/json or text/plain" },
      { status: 400 }
    );
  }

  if (!supabase) {
    return NextResponse.json(
      { error: "Server misconfigured: missing database env" },
      { status: 503 }
    );
  }
  const { error } = await supabase.from("check_ins").insert({
    mood,
    notes,
    recorded_at: recorded_at.toISOString(),
    source: "shortcut",
  });

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json(
      { error: "Failed to save check-in" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
