"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { BackgroundWrapper } from "@/components/BackgroundWrapper";
import { BackgroundSettings } from "@/components/BackgroundSettings";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { CheckIn } from "@/lib/db";

type Insight = {
  id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  summary: string | null;
  positive_factors: string[] | null;
  negative_factors: string[] | null;
  created_at: string;
};

const RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: null },
] as const;

const INSIGHT_PERIODS = [
  { label: "Last 30 days", value: "monthly" },
  { label: "Last quarter", value: "quarterly" },
  { label: "Last year", value: "yearly" },
] as const;

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Local date at start of day (00:00) or end of day (23:59:59.999) as ISO for API */
function toLocalDayISO(localDate: Date, endOfDay: boolean) {
  const y = localDate.getFullYear();
  const m = localDate.getMonth();
  const d = localDate.getDate();
  const boundary = endOfDay
    ? new Date(y, m, d, 23, 59, 59, 999)
    : new Date(y, m, d, 0, 0, 0, 0);
  return boundary.toISOString();
}

function formatRecordedAt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatChartDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Aggregate check-ins by day (avg mood) and compute 7-day rolling average */
function useChartData(checkIns: CheckIn[]) {
  return useMemo(() => {
    const byDay = new Map<string, { sum: number; count: number }>();
    for (const c of checkIns) {
      const day = toISODate(new Date(c.recorded_at));
      const cur = byDay.get(day) ?? { sum: 0, count: 0 };
      cur.sum += c.mood;
      cur.count += 1;
      byDay.set(day, cur);
    }
    const sorted = Array.from(byDay.entries())
      .map(([date, { sum, count }]) => ({
        date,
        mood: Math.round((sum / count) * 10) / 10,
        label: formatChartDate(date + "T12:00:00Z"),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i < sorted.length; i++) {
      const window = sorted.slice(Math.max(0, i - 6), i + 1);
      const avg =
        window.reduce((s, x) => s + x.mood, 0) / window.length;
      (sorted[i] as { date: string; mood: number; label: string; rolling?: number }).rolling =
        Math.round(avg * 10) / 10;
    }
    return sorted;
  }, [checkIns]);
}

function downloadCSV(checkIns: CheckIn[]) {
  const headers = "recorded_at,mood,notes\n";
  const rows = checkIns.map(
    (c) =>
      `"${c.recorded_at}",${c.mood},"${(c.notes ?? "").replace(/"/g, '""')}"`
  );
  const blob = new Blob([headers + rows.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `check-ins-${toISODate(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const [rangeIndex, setRangeIndex] = useState(1); // 30 days default
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightPeriod, setInsightPeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [generating, setGenerating] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const chartData = useChartData(checkIns);

  useEffect(() => {
    const range = RANGES[rangeIndex];
    const now = new Date();
    const to = now;
    const from = range.days
      ? new Date(now.getTime() - range.days * 24 * 60 * 60 * 1000)
      : null;
    const params = new URLSearchParams();
    params.set("to", toLocalDayISO(to, true));
    if (from) params.set("from", toLocalDayISO(from, false));
    setLoading(true);
    setError(null);
    fetch(`/api/checkins?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setCheckIns)
      .catch(() => setError("Failed to load check-ins"))
      .finally(() => setLoading(false));
  }, [rangeIndex]);

  useEffect(() => {
    setInsightsLoading(true);
    fetch("/api/insights?limit=10")
      .then((r) => (r.ok ? r.json() : []))
      .then(setInsights)
      .catch(() => setInsights([]))
      .finally(() => setInsightsLoading(false));
  }, []);

  function generateInsights() {
    setGenerating(true);
    setInsightError(null);
    fetch("/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodType: insightPeriod }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d.error ?? "Failed")));
        return r.json();
      })
      .then(() => fetch("/api/insights?limit=10"))
      .then((r) => r.json())
      .then(setInsights)
      .catch((e) => setInsightError(e.message ?? "Failed to generate insights"))
      .finally(() => setGenerating(false));
  }

  return (
    <BackgroundWrapper contentBlock>
      <main>
        <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-stone-500 hover:text-stone-700 text-sm"
          >
            Home
          </Link>
          <h1 className="text-xl font-semibold text-stone-800">
            Check-in dashboard
          </h1>
        </div>
      </header>

      <section className="mb-8">
        <label className="block text-sm font-medium text-stone-600 mb-2">
          Date range
        </label>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangeIndex(i)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                rangeIndex === i
                  ? "bg-stone-800 text-white"
                  : "bg-stone-200 text-stone-700 hover:bg-stone-300"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <p className="text-red-600 text-sm mb-4">{error}</p>
      )}

      {loading ? (
        <p className="text-stone-500">Loading…</p>
      ) : (
        <>
          {chartData.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-medium text-stone-800 mb-3">
                Mood over time
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12 }}
                      stroke="#78716c"
                    />
                    <YAxis
                      domain={[1, 10]}
                      tick={{ fontSize: 12 }}
                      stroke="#78716c"
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #e7e5e4" }}
                      labelFormatter={(_, payload) =>
                        payload[0]?.payload?.date
                          ? formatChartDate(payload[0].payload.date + "T12:00:00Z")
                          : ""
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="mood"
                      name="Mood (avg/day)"
                      stroke="#44403c"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rolling"
                      name="7-day average"
                      stroke="#78716c"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="text-lg font-medium text-stone-800">
                Check-ins ({checkIns.length})
              </h2>
              {checkIns.length > 0 && (
                <button
                  type="button"
                  onClick={() => downloadCSV(checkIns)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-stone-200 text-stone-700 hover:bg-stone-300 transition"
                >
                  Export CSV
                </button>
              )}
            </div>
            {checkIns.length > 10 && (
              <p className="text-stone-500 text-sm mb-3">
                Showing 10 most recent. Export CSV for full history.
              </p>
            )}
            <ul className="space-y-3">
            {checkIns.length === 0 ? (
              <li className="text-stone-500 text-sm">
                No check-ins in this range. Use your shortcut to add one.
              </li>
            ) : (
              checkIns.slice(0, 10).map((c) => (
                <li
                  key={c.id}
                  className="flex items-start gap-4 p-3 rounded-lg bg-white border border-stone-200"
                >
                  <span className="text-stone-500 text-sm whitespace-nowrap">
                    {formatRecordedAt(c.recorded_at)}
                  </span>
                  <span
                    className="font-medium text-stone-800 w-8"
                    title="Mood 1-10"
                  >
                    {c.mood}
                  </span>
                  {c.notes && (
                    <span className="text-stone-600 text-sm flex-1 line-clamp-2">
                      {c.notes}
                    </span>
                  )}
                </li>
              ))
            )}
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-medium text-stone-800 mb-3">
              Insights
            </h2>
            <p className="text-stone-600 text-sm mb-4">
              Use AI to summarize a period and surface positive and negative factors from your notes.
            </p>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {INSIGHT_PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setInsightPeriod(p.value as "monthly" | "quarterly" | "yearly")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    insightPeriod === p.value
                      ? "bg-stone-800 text-white"
                      : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={generateInsights}
                disabled={generating || checkIns.length === 0}
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none transition"
              >
                {generating ? "Generating…" : "Generate insights"}
              </button>
            </div>
            {insightError && (
              <p className="text-red-600 text-sm mb-3">{insightError}</p>
            )}
            {insightsLoading ? (
              <p className="text-stone-500 text-sm">Loading insights…</p>
            ) : insights.length === 0 ? (
              <p className="text-stone-500 text-sm">
                No insights yet. Generate one for the last 30 days, quarter, or year.
              </p>
            ) : (
              <ul className="space-y-4">
                {insights.map((i) => (
                  <li
                    key={i.id}
                    className="p-4 rounded-lg bg-white border border-stone-200"
                  >
                    <div className="text-stone-500 text-sm mb-2">
                      {i.period_start} – {i.period_end}
                      {i.period_type !== "monthly" && ` (${i.period_type})`}
                    </div>
                    {i.summary && (
                      <p className="text-stone-700 text-sm mb-3">{i.summary}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium text-emerald-700">Positive</span>
                        <ul className="list-disc list-inside text-stone-600 mt-1">
                          {(i.positive_factors ?? []).map((f, k) => (
                            <li key={k}>{f}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="font-medium text-amber-700">Negative</span>
                        <ul className="list-disc list-inside text-stone-600 mt-1">
                          {(i.negative_factors ?? []).map((f, k) => (
                            <li key={k}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

        <BackgroundSettings />

        <footer className="mt-8 pt-6 border-t border-stone-200 text-stone-500 text-sm">
          <p>
            Add check-ins from your iPhone shortcut (POST to /api/checkin).
          </p>
        </footer>
      </main>
    </BackgroundWrapper>
  );
}
