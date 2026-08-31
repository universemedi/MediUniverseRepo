-- MediUnivers — Website template catalog, both audiences (req #9, #11, #12)
-- WebsiteTemplate is a platform-managed catalog row (which slots/branding a
-- template offers by default); WebsiteConfig (per org) / the new singleton
-- platform_website_config hold the actual filled-in values, referencing a
-- chosen template. Config-driven per the confirmed decision: curated
-- templates + a structured settings form, not a freeform page builder.

create table website_templates (
    id                  bigserial primary key,
    code                varchar(50)  not null unique,
    name                varchar(120) not null,
    audience            varchar(20)  not null,
    description         varchar(400),
    preview_image_url   varchar(500),
    active              boolean      not null default true,
    sort_order          integer      not null default 0,
    created_at          timestamptz  not null default now()
);

insert into website_templates (code, name, audience, description, sort_order) values
    ('CLASSIC', 'Classic', 'ORGANIZATION', 'Clean, single-page clinic site with hero, services, doctors, testimonials and booking.', 0),
    ('MEDIUNIVERS_DEFAULT', 'MediUnivers Default', 'PLATFORM', 'The default MediUnivers marketing site layout.', 0);

alter table website_configs add column template_id bigint references website_templates(id);
alter table website_configs add column font_family varchar(60);
alter table website_configs add column background_color varchar(20);
alter table website_configs add column text_size_scale varchar(10) not null default 'MEDIUM';
alter table website_configs add column banners_json varchar(4000);
alter table website_configs add column nav_items_json varchar(2000);
alter table website_configs add column footer_columns_json varchar(2000);

update website_configs set template_id = (select id from website_templates where code = 'CLASSIC') where template_id is null;

create table platform_website_config (
    id                  bigserial primary key,
    template_id         bigint references website_templates(id),
    published           boolean      not null default false,
    logo_url            varchar(400),
    primary_color       varchar(20)  not null default '#0f766e',
    secondary_color     varchar(20)  not null default '#0f172a',
    font_family         varchar(60),
    background_color    varchar(20),
    text_size_scale     varchar(10)  not null default 'MEDIUM',
    tagline             varchar(200),
    hero_heading        varchar(200),
    hero_subheading     varchar(400),
    about_content       varchar(4000),
    contact_email       varchar(180),
    contact_phone       varchar(30),
    contact_address     varchar(400),
    facebook_url        varchar(300),
    instagram_url       varchar(300),
    twitter_url         varchar(300),
    linkedin_url        varchar(300),
    youtube_url         varchar(300),
    seo_title           varchar(200),
    seo_description     varchar(400),
    seo_keywords        varchar(300),
    banners_json        varchar(4000),
    nav_items_json      varchar(2000),
    footer_columns_json varchar(2000)
);

insert into platform_website_config (template_id)
select id from website_templates where code = 'MEDIUNIVERS_DEFAULT';
