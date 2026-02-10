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
2. In the SQL Editor, run the contents of `supabase/migrations/001_initial.sql` to create `check_ins` and `insights` tables.
3. In Project Settings → API: copy **Project URL** and **service_role** key (keep the latter secret).

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

Your shortcut should send a **POST** request to your app’s check-in URL. You can keep your existing “append to Apple Note” step as a backup.

### Option A: JSON body (recommended)

1. In Shortcuts: get **Current Date** and format it (e.g. “Jan 12, 2026 at 9:00 PM”).
2. Ask for **Number** (mood 1–10) and **Text** (notes, optional).
3. Add **Get Contents of URL**:
   - URL: `https://<your-app>.vercel.app/api/checkin`
   - Method: **POST**
   - Headers: `Content-Type` = `application/json`
   - If you use `CHECKIN_API_KEY`, add header: `x-api-key` = `YOUR_API_KEY`
   - Request Body: **JSON**
   - JSON body (use “Dictionary” and then “Get Dictionary from Input” or build the JSON):
     - `date` = (formatted current date)
     - `mood` = (mood number)
     - `notes` = (notes text)

To build the JSON in Shortcuts: use **Dictionary** with keys `date`, `mood`, `notes`, then **Get Dictionary from Input** and pass that as the request body (many Shortcuts versions use “Request Body” = “JSON” and then the dictionary).

### Option B: Semicolon-separated (same as your Apple Note line)

If your shortcut already builds a string like:

`Jan 12, 2026 at 9:00PM; 8; Hang out with friends after chapter`

you can send that in the request body:

- **Request Body**: **Text**
- Text: the string above (date; mood; notes)

Or send as JSON: `{ "raw": "Jan 12, 2026 at 9:00PM; 8; Your notes" }` with `Content-Type: application/json`.

The API will parse it and set the check-in date from the first part.

## API

- **POST /api/checkin** — Submit a check-in (see above). Optional API key via header `x-api-key` or query `?key=...`.
- **GET /api/checkins?from=...&to=...** — List check-ins (ISO date range).
- **GET /api/insights?limit=10** — List stored insights.
- **POST /api/insights** — Generate insights for a period. Body: `{ "periodType": "monthly" | "quarterly" | "yearly" }` or `{ "startDate", "endDate" }`.

## Database limits and uptime

- **Supabase free tier**: 500MB — more than enough for years of daily check-ins and insights.
- **Vercel free tier**: No uptime SLA; cold starts may make the first request after idle a few seconds slower. The app is not taken down when idle.
