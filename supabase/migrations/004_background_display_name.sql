-- Add display name for custom backgrounds (original filename without extension)

alter table background_images add column if not exists display_name text;
