# Mental Health Check-in

Daily mood tracking via iPhone Shortcut, with a Next.js dashboard, Supabase persistence, and LLM-generated insights.

## Architecture

> Keep this diagram in sync: update it in the same PR as any architectural change.

```mermaid
flowchart TB
    subgraph clients["Clients"]
        shortcut["iPhone Shortcut<br/>daily mood check-in"]
        browser["Browser<br/>intro / login / dashboard"]
    end

    subgraph vercel["Vercel — Next.js 15 (App Router)"]
        middleware["middleware.ts<br/>refresh Supabase session cookie"]

        subgraph pages["Pages"]
            home["/ — cinematic intro → home"]
            login["/login"]
            dashboard["/dashboard — Overview + Style tabs<br/>mood chart (Recharts), insights, backgrounds"]
        end

        subgraph api["API Routes"]
            checkin["POST /api/checkin<br/>parses ?raw=date;mood;notes<br/>optional CHECKIN_API_KEY"]
            checkins["GET /api/checkins<br/>list by date range"]
            insights_api["GET / POST /api/insights"]
            background["GET / POST / DELETE /api/background<br/>sharp crop to 1920×1080"]
            logout["POST /api/auth/logout"]
            keepalive["GET /api/keepalive<br/>prevents free-tier pause"]
        end

        cron["Vercel Cron<br/>daily @ 12:00 UTC"]
    end

    subgraph supabase["Supabase"]
        auth["Auth<br/>cookie-based sessions (@supabase/ssr)"]
        subgraph postgres["Postgres"]
            check_ins[("check_ins<br/>mood, notes, recorded_at")]
            insights_table[("insights<br/>summary, pos/neg factors")]
            background_images[("background_images<br/>storage_path, display_name")]
        end
        bucket[("Storage bucket<br/>backgrounds")]
    end

    openai["OpenAI<br/>gpt-4o-mini (JSON mode)"]

    shortcut -->|"POST ?raw=..."| checkin
    browser --> middleware --> pages
    login --> auth
    logout --> auth
    dashboard --> checkins
    dashboard --> insights_api
    dashboard --> background

    checkin --> check_ins
    checkins --> check_ins
    insights_api -->|"read range"| check_ins
    insights_api -->|"analyze"| openai
    insights_api -->|"store result"| insights_table
    background --> background_images
    background --> bucket

    cron --> keepalive -->|"SELECT 1 row"| check_ins
```

*(README content to be rewritten.)*
