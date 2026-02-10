import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { analyzeCheckIns } from "@/lib/llm";

export async function GET(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Server misconfigured: missing database env" },
      { status: 503 }
    );
  }
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 10, 50);
  const { data, error } = await supabase
    .from("insights")
    .select("id, period_type, period_start, period_end, summary, positive_factors, negative_factors, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("Supabase error:", error);
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 }
    );
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Server misconfigured: missing database env" },
      { status: 503 }
    );
  }

  let body: { periodType?: string; startDate?: string; endDate?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const periodType = body.periodType ?? "monthly";
  let startDate: string;
  let endDate: string;
  const now = new Date();

  if (body.startDate && body.endDate) {
    startDate = body.startDate;
    endDate = body.endDate;
  } else {
    switch (periodType) {
      case "quarterly": {
        const end = new Date(now);
        const start = new Date(now);
        start.setMonth(start.getMonth() - 3);
        startDate = start.toISOString().slice(0, 10);
        endDate = end.toISOString().slice(0, 10);
        break;
      }
      case "yearly": {
        const end = new Date(now);
        const start = new Date(now);
        start.setFullYear(start.getFullYear() - 1);
        startDate = start.toISOString().slice(0, 10);
        endDate = end.toISOString().slice(0, 10);
        break;
      }
      default: {
        const end = new Date(now);
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        startDate = start.toISOString().slice(0, 10);
        endDate = end.toISOString().slice(0, 10);
      }
    }
  }

  const from = `${startDate}T00:00:00.000Z`;
  const to = `${endDate}T23:59:59.999Z`;

  const { data: checkIns, error: fetchError } = await supabase
    .from("check_ins")
    .select("recorded_at, mood, notes")
    .gte("recorded_at", from)
    .lte("recorded_at", to)
    .order("recorded_at", { ascending: true });

  if (fetchError) {
    console.error("Supabase error:", fetchError);
    return NextResponse.json(
      { error: "Failed to fetch check-ins" },
      { status: 500 }
    );
  }

  if (!checkIns?.length) {
    return NextResponse.json(
      { error: "No check-ins in this period" },
      { status: 400 }
    );
  }

  const result = await analyzeCheckIns(checkIns);
  if (!result) {
    return NextResponse.json(
      { error: "LLM analysis failed or OPENAI_API_KEY not set" },
      { status: 502 }
    );
  }

  const { error: insertError } = await supabase.from("insights").insert({
    period_type: periodType,
    period_start: startDate,
    period_end: endDate,
    summary: result.summary,
    positive_factors: result.positive_factors,
    negative_factors: result.negative_factors,
  });

  if (insertError) {
    console.error("Supabase insert insights error:", insertError);
    return NextResponse.json(
      { error: "Failed to save insights" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    period_type: periodType,
    period_start: startDate,
    period_end: endDate,
    ...result,
  });
}
