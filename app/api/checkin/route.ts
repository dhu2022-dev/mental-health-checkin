import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { parseSemicolonLine } from "@/lib/parse-checkin";
import { createClient } from "@/lib/supabase/server";

function getApiKey(req: NextRequest): string | null {
  const header =
    req.headers.get("x-api-key") ?? req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return header?.trim() ?? req.nextUrl.searchParams.get("key") ?? null;
}

/** Web check-in: authenticated via session, recorded_at is always server now(). */
async function handleWebCheckin(req: NextRequest): Promise<NextResponse> {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const mood = Number(raw.mood);
  if (!Number.isInteger(mood) || mood < 1 || mood > 10) {
    return NextResponse.json(
      { error: "mood must be an integer between 1 and 10" },
      { status: 400 }
    );
  }
  const notes =
    typeof raw.notes === "string" && raw.notes.trim()
      ? raw.notes.trim()
      : null;

  if (!supabase) {
    return NextResponse.json(
      { error: "Server misconfigured: missing database env" },
      { status: 503 }
    );
  }

  const { error } = await supabase.from("check_ins").insert({
    mood,
    notes,
    recorded_at: new Date().toISOString(),
    source: "web",
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to save check-in" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

/** Shortcut check-in: authenticated via API key, date comes from the ?raw= param. */
async function handleShortcutCheckin(
  req: NextRequest
): Promise<NextResponse> {
  const apiKey = process.env.CHECKIN_API_KEY;
  if (apiKey) {
    const provided = getApiKey(req);
    if (provided !== apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const raw = req.nextUrl.searchParams.get("raw");
  const parsed = raw?.trim() ? parseSemicolonLine(raw) : null;

  if (!parsed) {
    return NextResponse.json(
      { error: "Missing or invalid ?raw=date;mood;notes in URL" },
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

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const isWebCheckin =
    !req.nextUrl.searchParams.has("raw") &&
    req.headers.get("content-type")?.includes("application/json");

  return isWebCheckin
    ? handleWebCheckin(req)
    : handleShortcutCheckin(req);
}
