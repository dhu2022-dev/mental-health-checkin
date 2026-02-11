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

  // Basic request info for debugging (appears in Vercel function logs)
  const contentType = req.headers.get("content-type") ?? "";
  console.log("[checkin] incoming request", {
    method: req.method,
    contentType,
  });

  // Parse the incoming payload into a single canonical shape.
  // Expected formats:
  // 1) JSON: { "raw": "Feb 10, 2026 at 9:02AM; 5; Some notes" }
  // 2) Plain text body: "Feb 10, 2026 at 9:02AM; 5; Some notes"
  // 3) JSON: { "mood": 5, "notes": "Some notes", "date": "Feb 10, 2026 at 9:02AM" }
  //
  // All of these become { recorded_at: Date, mood: number, notes: string | null }.
  let parsed:
    | {
        recorded_at: Date;
        mood: number;
        notes: string | null;
      }
    | null = null;

  if (contentType.includes("application/json")) {
    const body = await req.json();
    console.log("[checkin] JSON body", body);
    if (body.raw !== undefined && body.raw !== null) {
      // Primary path: semicolon-separated line, same as your Apple Note.
      // Shortcuts sometimes sends raw as an object { text: "..." }; extract the string.
      let raw: string;
      if (typeof body.raw === "string") {
        raw = body.raw;
      } else if (typeof body.raw === "object") {
        const obj = body.raw as Record<string, unknown>;
        const extracted =
          (typeof obj.text === "string" ? obj.text : null) ??
          (typeof obj.string === "string" ? obj.string : null) ??
          (typeof obj.value === "string" ? obj.value : null) ??
          (typeof obj.content === "string" ? obj.content : null) ??
          (Object.values(obj).find((v) => typeof v === "string") as string | undefined);
        raw = extracted ?? String(body.raw);
      } else {
        raw = String(body.raw);
      }
      console.log("[checkin] using raw field", raw);
      const fromRaw = parseSemicolonLine(raw);
      if (!fromRaw) {
        const debug: Record<string, unknown> = {
          rawType: typeof body.raw,
          rawString: raw,
          rawLength: raw.length,
          parts: raw.split(";").map((p) => p.trim()),
        };
        if (typeof body.raw === "object" && body.raw !== null) {
          debug.rawKeys = Object.keys(body.raw as object);
          debug.rawJson = JSON.stringify(body.raw);
        }
        return NextResponse.json(
          {
            error: "Invalid raw format: expected 'date; mood; notes'",
            debug,
          },
          { status: 400 }
        );
      }
      parsed = fromRaw;
    } else if (body.mood !== undefined) {
      // Simple JSON body, useful for curl / manual tests.
      const moodNum = Number(body.mood);
      if (!Number.isFinite(moodNum) || moodNum < 1 || moodNum > 10) {
        console.log("[checkin] invalid mood in JSON body", {
          rawMood: body.mood,
          moodNum,
        });
        return NextResponse.json(
          { error: "Invalid mood: must be a number 1-10" },
          { status: 400 }
        );
      }
      const notesValue =
        typeof body.notes === "string" ? body.notes.trim() || null : null;
      let recorded_at: Date;
      if (body.date && typeof body.date === "string") {
        const d = parseShortcutDate(body.date);
        recorded_at = d ?? new Date();
      } else {
        recorded_at = new Date();
      }
      parsed = {
        recorded_at,
        mood: moodNum,
        notes: notesValue,
      };
    } else {
      console.log("[checkin] JSON body missing raw/mood fields", {
        keys: Object.keys(body),
      });
      return NextResponse.json(
        {
          error:
            "Invalid body: expected either { raw: 'date; mood; notes' } or { mood, notes?, date? }",
        },
        { status: 400 }
      );
    }
  } else if (contentType.includes("text/plain")) {
    const raw = await req.text();
    console.log("[checkin] text/plain body", raw);
    const fromRaw = parseSemicolonLine(raw);
    if (!fromRaw) {
      return NextResponse.json(
        { error: "Invalid format: expected 'date; mood; notes'" },
        { status: 400 }
      );
    }
    parsed = fromRaw;
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

  if (!parsed) {
    console.log("[checkin] parsed payload is null after handling", {
      contentType,
    });
    return NextResponse.json(
      { error: "Unable to parse check-in payload" },
      { status: 400 }
    );
  }

  const { recorded_at, mood, notes } = parsed;
  console.log("[checkin] inserting row", {
    recorded_at: recorded_at.toISOString(),
    mood,
    notes,
  });

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
