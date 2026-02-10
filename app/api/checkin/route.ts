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
      const moodVal =
        typeof body.mood === "number" ? body.mood : parseInt(String(body.mood), 10);
      if (Number.isNaN(moodVal) || moodVal < 1 || moodVal > 10) {
        return NextResponse.json(
          { error: "Invalid body: need mood (1-10) and optional date, notes" },
          { status: 400 }
        );
      }
      mood = moodVal;
      notes =
        typeof body.notes === "string" ? body.notes.trim() || null : null;
      if (body.date && typeof body.date === "string") {
        const d = parseShortcutDate(body.date);
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
