# Mental Health Check-in

Daily mood tracking via iPhone Shortcut, with a Next.js dashboard, Supabase persistence, and LLM-generated insights.

## Architecture

### System overview

```mermaid
%%{init: {"themeVariables": {"edgeLabelBackground": "transparent"}}}%%
flowchart LR
    shortcut("iPhone Shortcut") -->|"POST /api/checkin"| app
    browser("Browser") -->|"login / dashboard"| app

    subgraph vercel["Vercel"]
        app("Next.js 15 app<br/>pages + API routes")
    end

    subgraph supabase["Supabase"]
        auth("Auth")
        db[("Postgres")]
        bucket[("Storage<br/>backgrounds")]
    end

    app --> auth
    app --> db
    app --> bucket
    app -->|"insights"| openai("OpenAI<br/>gpt-4o-mini")

    classDef client fill:#dbeafe,stroke:#60a5fa,color:#1e3a8a
    classDef app fill:#e2e8f0,stroke:#64748b,color:#0f172a
    classDef supa fill:#d1fae5,stroke:#34d399,color:#065f46
    classDef ai fill:#ede9fe,stroke:#a78bfa,color:#5b21b6

    class shortcut,browser client
    class app app
    class auth,db,bucket supa
    class openai ai

    style vercel fill:none,stroke:#64748b
    style supabase fill:none,stroke:#34d399
```

### API routes → data

```mermaid
%%{init: {"themeVariables": {"edgeLabelBackground": "transparent"}}}%%
flowchart LR
    checkin("POST /api/checkin<br/>?raw=date;mood;notes") --> check_ins[("check_ins")]
    checkins("GET /api/checkins") --> check_ins

    insights("POST /api/insights") -->|"read"| check_ins
    insights --> openai("OpenAI")
    insights -->|"store"| insights_t[("insights")]

    background("/api/background<br/>GET / POST / DELETE") --> bg_t[("background_images")]
    background --> bucket[("backgrounds bucket")]

    logout("POST /api/auth/logout") --> auth("Supabase Auth")

    classDef route fill:#e2e8f0,stroke:#64748b,color:#0f172a
    classDef supa fill:#d1fae5,stroke:#34d399,color:#065f46
    classDef ai fill:#ede9fe,stroke:#a78bfa,color:#5b21b6

    class checkin,checkins,insights,background,logout route
    class check_ins,insights_t,bg_t,bucket,auth supa
    class openai ai
```
