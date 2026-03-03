-- Multiple custom backgrounds: new table and migration from legacy app_settings

create table if not exists background_images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

-- Migrate existing custom_background from app_settings if present
do $$
declare
  custom_url text;
  extracted_path text;
begin
  select (value->>'url') into custom_url
  from app_settings
  where key = 'custom_background';
  if custom_url is not null and custom_url != '' then
    extracted_path := (regexp_matches(custom_url, '[^/]+$'))[1];
    if extracted_path is null or extracted_path = '' then
      extracted_path := 'custom.jpg';
    end if;
    insert into background_images (storage_path)
    values (extracted_path)
    on conflict (storage_path) do nothing;
    delete from app_settings where key = 'custom_background';
  end if;
end $$;
