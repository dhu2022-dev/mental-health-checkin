import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Server misconfigured: missing database env" },
      { status: 503 }
    );
  }
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  let query = supabase
    .from("check_ins")
    .select("id, mood, notes, recorded_at, created_at, source")
    .order("recorded_at", { ascending: false });
  if (from) query = query.gte("recorded_at", from);
  if (to) query = query.lte("recorded_at", to);
  const { data, error } = await query;
  if (error) {
    console.error("Supabase error:", error);
    return NextResponse.json(
      { error: "Failed to fetch check-ins" },
      { status: 500 }
    );
  }
  return NextResponse.json(data ?? []);
}
