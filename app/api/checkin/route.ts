import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { parseSemicolonLine } from "@/lib/parse-checkin";

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

  const showDebug = req.nextUrl.searchParams.get("debug") === "1";

  let raw: string | null = null;
  let source: "body" | "query" = "query";

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = await req.json();
      const bodyRaw = typeof body?.raw === "string" ? body.raw.trim() : null;
      if (bodyRaw) {
        raw = bodyRaw;
        source = "body";
      }
    } catch {
      // Fall through to query
    }
  }

  if (!raw) {
    raw = req.nextUrl.searchParams.get("raw");
  }

  const parsed = raw?.trim() ? parseSemicolonLine(raw) : null;

  if (!parsed) {
    return NextResponse.json(
      {
        error: "Missing or invalid payload. Use ?raw=date;mood;notes in URL or JSON body { raw: '...' }",
      },
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
    mood: parsed.mood,
    notes: parsed.notes,
    recorded_at: parsed.recorded_at.toISOString(),
    source: "shortcut",
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to save check-in" },
      { status: 500 }
    );
  }

  const res: { ok: boolean; debug?: object } = { ok: true };
  if (showDebug) {
    res.debug = {
      source,
      raw,
      parsed: {
        mood: parsed.mood,
        notes: parsed.notes,
        recorded_at: parsed.recorded_at.toISOString(),
      },
    };
  }
  return NextResponse.json(res);
}
