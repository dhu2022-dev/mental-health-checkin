# Mental Health Check-in

A small web app for daily mood check-ins: receive data from an iPhone shortcut, view trends and charts, export to CSV, and run LLM-powered insights (positive/negative factors) for monthly, quarterly, or yearly review.

## Stack

- **Next.js 15** (App Router) on **Vercel**
- **Supabase** (Postgres) for check-ins and insights
- **OpenAI** (gpt-4o-mini) for insights
- **Recharts** for mood-over-time charts

## Setup

### 1. Clone and install

```bash
cd mental-health-checkin
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. In the SQL Editor, run the migrations in order: `001_initial.sql`, then `002_backgrounds.sql` (adds `app_settings` for custom backgrounds).
3. In Project Settings → API: copy **Project URL** and **service_role** key (keep the latter secret).
4. (Optional) For custom dashboard backgrounds: in Storage, create a bucket named `backgrounds` (Public ON). The API will create it on first upload if it doesn’t exist.

### 3. Environment variables

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `OPENAI_API_KEY` — from [platform.openai.com](https://platform.openai.com) (for Insights)
- `CHECKIN_API_KEY` (optional) — a secret string; if set, the shortcut must send it (e.g. `x-api-key` header) or check-in requests will be rejected.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use the dashboard at `/dashboard`.

### 5. Deploy to Vercel

1. Push the repo to GitHub and import the project in [Vercel](https://vercel.com).
2. Add the same env vars in Vercel (Project → Settings → Environment Variables).
3. Deploy. Your check-in URL will be `https://<your-project>.vercel.app/api/checkin`.

## iPhone Shortcut

### Query string (recommended — most reliable from Shortcuts)

1. Build the raw line: get **Current Date** (formatted), **Number** (mood 1–10), **Text** (notes), then concatenate with semicolons: `[Date]; [Mood]; [Notes]` → save as **RawVars**.
2. **URL Encode** RawVars → save as **RawEncoded**.
3. **Get Contents of URL**:
   - URL: `https://<your-app>.vercel.app/api/checkin?raw=` + **RawEncoded**
   - Method: **POST**
   - Request Body: none

Optional: add `x-api-key` header or `?key=...` if you set `CHECKIN_API_KEY`.

## API

- **POST /api/checkin** — Submit a check-in (see above). Optional API key via header `x-api-key` or query `?key=...`.
- **GET /api/checkins?from=...&to=...** — List check-ins (ISO date range).
- **GET /api/insights?limit=10** — List stored insights.
- **POST /api/insights** — Generate insights for a period. Body: `{ "periodType": "monthly" | "quarterly" | "yearly" }` or `{ "startDate", "endDate" }`.

## Database limits and uptime

- **Supabase free tier**: 500MB — more than enough for years of daily check-ins and insights.
- **Vercel free tier**: No uptime SLA; cold starts may make the first request after idle a few seconds slower. The app is not taken down when idle.
