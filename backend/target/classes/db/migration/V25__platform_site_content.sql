-- Extends the platform's own website config with the remaining scalar content
-- needed to make MediUnivers' public marketing site fully dynamic: the About
-- page mission paragraph, homepage stat tiles (small repeatable array, same
-- convention as the existing banners_json column), and the three legal pages
-- (fixed singleton documents, not worth a separate CRUD-able table).
alter table platform_website_config add column mission_content varchar(4000);
alter table platform_website_config add column stats_json varchar(2000);
alter table platform_website_config add column privacy_content text;
alter table platform_website_config add column terms_content text;
alter table platform_website_config add column security_content text;
