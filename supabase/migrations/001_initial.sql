-- Check-ins: one row per daily submission from the shortcut
create table if not exists check_ins (
  id uuid primary key default gen_random_uuid(),
  mood smallint not null check (mood >= 1 and mood <= 10),
  notes text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  source text default 'shortcut'
);

create index if not exists idx_check_ins_recorded_at on check_ins (recorded_at desc);

-- Insights: stored LLM analysis for a date range
create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  period_type text not null,
  period_start date not null,
  period_end date not null,
  summary text,
  positive_factors jsonb,
  negative_factors jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_insights_period on insights (period_start, period_end);
