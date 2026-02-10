export type InsightResult = {
  summary: string;
  positive_factors: string[];
  negative_factors: string[];
};

const SYSTEM = `You are a supportive assistant that analyzes brief daily journal entries (mood 1-10 and optional notes).
Return valid JSON only, no markdown or explanation, with this exact shape:
{
  "summary": "2-3 sentence overall summary of this period",
  "positive_factors": ["factor 1", "factor 2", "..."],
  "negative_factors": ["factor 1", "factor 2", "..."]
}
List 3-5 positive and 3-5 negative factors or themes. Be concise and specific to the entries.`;

export async function analyzeCheckIns(
  entries: { recorded_at: string; mood: number; notes: string | null }[]
): Promise<InsightResult | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const blob = entries
    .map(
      (e) =>
        `[${e.recorded_at}] Mood: ${e.mood}${e.notes ? ` — ${e.notes}` : ""}`
    )
    .join("\n");

  if (!blob.trim()) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Analyze these daily check-ins and return the JSON object only:\n\n${blob}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("OpenAI API error:", res.status, err);
    return null;
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as InsightResult;
    if (
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.positive_factors) ||
      !Array.isArray(parsed.negative_factors)
    ) {
      return null;
    }
    return {
      summary: parsed.summary,
      positive_factors: parsed.positive_factors.filter((x) => typeof x === "string"),
      negative_factors: parsed.negative_factors.filter((x) => typeof x === "string"),
    };
  } catch {
    return null;
  }
}
