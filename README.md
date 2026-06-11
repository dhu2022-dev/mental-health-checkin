# Mental Health Check-in

Daily mood tracking via iPhone Shortcut, with a Next.js dashboard, Supabase persistence, and LLM-generated insights.

## Architecture

> Keep these diagrams in sync: update them in the same PR as any architectural change.

### System overview

```mermaid
flowchart LR
    shortcut["iPhone Shortcut"] -->|"POST /api/checkin"| app
    browser["Browser"] -->|"login / dashboard"| app

    subgraph vercel["Vercel"]
        app["Next.js 15 app<br/>pages + API routes"]
        cron["Cron (daily)"] -->|"/api/keepalive"| app
    end

    app --> auth["Supabase Auth"]
    app --> db[("Supabase Postgres")]
    app --> bucket[("Supabase Storage<br/>backgrounds")]
    app -->|"insights"| openai["OpenAI<br/>gpt-4o-mini"]
```

### API routes → data

```mermaid
flowchart LR
    checkin["POST /api/checkin<br/>?raw=date;mood;notes"] --> check_ins[("check_ins")]
    checkins["GET /api/checkins"] --> check_ins
    keepalive["GET /api/keepalive"] -->|"1-row read"| check_ins

    insights["POST /api/insights"] -->|"read range"| check_ins
    insights -->|"analyze"| openai["OpenAI"]
    insights -->|"store"| insights_t[("insights")]

    background["/api/background<br/>GET / POST / DELETE"] --> bg_t[("background_images")]
    background --> bucket[("backgrounds bucket")]

    logout["POST /api/auth/logout"] --> auth["Supabase Auth"]
```

*(README content to be rewritten.)*
