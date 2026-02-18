# Mental Health Check-in

A calm, minimal web app for daily mood tracking: capture check-ins via an iPhone Shortcut, visualize trends in a chart, export to CSV, and generate LLM-powered insights. Built with Next.js, Supabase, and OpenAI.

## Features

- **One-tap check-ins** — iPhone Shortcut sends mood (1–10), optional notes, and date in a single request
- **Mood chart** — Line chart with daily average + 7-day rolling average (Recharts)
- **LLM insights** — GPT-4o-mini analyzes your entries and surfaces positive/negative themes for any date range
- **Custom dashboard backgrounds** — Upload your own images (max 4MB); auto-cropped to 16:9 for consistent display
- **Cinematic intro** — Phase-based animation: video → smoke overlay → quote → fade to home

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Hosting | Vercel |
| Database | Supabase (Postgres) |
| Storage | Supabase Storage (backgrounds) |
| LLM | OpenAI gpt-4o-mini |
| Charts | Recharts |
| Images | sharp (server-side crop/resize) |

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd mental-health-checkin
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. In the **SQL Editor**, run the migrations in order:
   - `supabase/migrations/001_initial.sql` — check-ins and insights tables
   - `supabase/migrations/002_backgrounds.sql` — app_settings for backgrounds
3. In **Project Settings → API**: copy **Project URL** and **service_role** key (keep secret).
4. In **Storage**, create a bucket named `backgrounds` (Public ON). The API can also create it on first upload.
5. *(Optional)* Seed the zen/mountain background: with the app running, `npm run seed:backgrounds`.

### 3. Environment variables

Copy `.env.example` to `.env.local` and set:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) — for Insights |
| `CHECKIN_API_KEY` | Optional; if set, shortcut must send it or check-ins are rejected |

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

### 5. Deploy to Vercel

1. Push to GitHub and import the project in [Vercel](https://vercel.com).
2. Add the env vars in Vercel (Settings → Environment Variables).
3. Deploy. Check-in URL: `https://<your-project>.vercel.app/api/checkin`.

---

## iPhone Shortcut

iOS Shortcuts can't easily send JSON bodies, so we use a **query-string payload** instead.

### Build the payload

1. Combine: `[Current Date]; [Mood 1–10]; [Notes]` → save as **RawVars**
2. **URL Encode** RawVars → save as **RawEncoded**
3. In **Get Contents of URL**:
   - **URL**: `https://<your-app>.vercel.app/api/checkin?raw=` + RawEncoded
   - **Method**: POST
   - **Body**: none

**Example RawVars:** `Feb 10, 2026 at 9:02AM; 5; Felt calm today`

### Optional API key

If `CHECKIN_API_KEY` is set, add `x-api-key: <key>` header or `?key=<key>` query param.

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/checkin` | POST | Submit check-in. Query: `?raw=date;mood;notes` (URL-encoded) |
| `/api/checkins` | GET | List check-ins. Query: `from`, `to` (ISO dates) |
| `/api/insights` | GET | List stored insights. Query: `limit` |
| `/api/insights` | POST | Generate LLM insights. Body: `{ startDate, endDate, periodType? }` |
| `/api/background` | GET | List backgrounds (ink gradient, zen, custom) |
| `/api/background` | POST | Upload custom background (multipart/form-data) |
| `/api/background` | DELETE | Remove custom background |
| `/api/background/seed` | POST | One-time seed: fetches a mountain image to Supabase and adds to rotation |

---

## Cool details (for engineers)

### Raw check-in format

Shortcuts' JSON support is flaky, so we accept `date;mood;notes` in the URL query string. `parseSemicolonLine()` handles Apple's default date format (`Jan 12, 2026 at 9:00PM`) and falls back to "now" if parsing fails.

### Phase-based intro

The home page uses a simple state machine: `intro` → `smoke` → `quote` → `fadeOut` → `home`. Video starts paused, fades in over 1.2s, then plays; smoke overlay overlaps the last ~1.2s; quote fades in during smoke. Skip uses `sessionStorage` so a refresh in the same session goes straight to home.

### Backgrounds from DB

All backgrounds live in Supabase: `app_settings` (custom + zen URLs) and the `backgrounds` bucket. No hardcoded image URLs in the client. Sharp crops/resizes uploads to 1920×1080 (fit: cover) for consistent display; a gradient filler handles widescreen when the image doesn't reach edges.

### Unified date range

Chart and insights share one date selector (7 / 30 / 90 days, All time). Insights may be brief for 7 days but avoid redundant controls.

### LLM JSON mode

`analyzeCheckIns()` uses `response_format: { type: "json_object" }` for deterministic JSON; the system prompt defines the exact output shape.

---

## Limits and notes

- **Supabase free tier**: 500MB — enough for years of check-ins + insights.
- **Vercel free tier**: No SLA; cold starts can add a few seconds on first request.
- **Vercel serverless**: Request body limit ~4.5MB, so we cap uploads at 4MB.
