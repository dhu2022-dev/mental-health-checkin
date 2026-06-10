import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

/**
 * Pinged daily by Vercel Cron (see vercel.json) so the Supabase free-tier
 * project never hits the 7-day inactivity pause.
 */
export async function GET(req: NextRequest) {
  // Vercel sends this header automatically when CRON_SECRET is set,
  // preventing strangers from invoking the endpoint.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!supabase) {
    return NextResponse.json(
      { error: "Server misconfigured: missing database env" },
      { status: 503 }
    );
  }

  const { error } = await supabase
    .from("check_ins")
    .select("id")
    .limit(1);

  if (error) {
    return NextResponse.json({ error: "Database ping failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
}
