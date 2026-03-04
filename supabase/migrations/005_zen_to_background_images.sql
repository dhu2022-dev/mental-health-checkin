-- Move zen from app_settings into background_images (single source of truth)
-- If zen exists in app_settings, ensure zen.jpg row exists in background_images

insert into background_images (storage_path, display_name)
values ('zen.jpg', 'Zen')
on conflict (storage_path) do update set display_name = 'Zen';

-- Remove zen from app_settings; backgrounds now come only from background_images
delete from app_settings where key = 'zen_background';
