-- Store custom background URL (uploaded to Supabase Storage)
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Create the "backgrounds" bucket in Supabase Dashboard: Storage → New bucket → name "backgrounds", Public ON.
-- Or run once: supabase.storage.createBucket('backgrounds', { public: true })
