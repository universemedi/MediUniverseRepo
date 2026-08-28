-- MediUnivers — Website Builder (spec: template-based, Org Owner managed)

alter table doctors add column visible_on_website boolean not null default true;

create table website_configs (
    id                  bigserial primary key,
    organization_id     bigint       not null unique references organizations(id) on delete cascade,
    template_code       varchar(30)  not null default 'CLASSIC',
    published           boolean      not null default false,
    logo_url            varchar(400),
    primary_color       varchar(20)  not null default '#0f766e',
    secondary_color     varchar(20)  not null default '#0f172a',
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
    whatsapp_number     varchar(30),
    seo_title           varchar(200),
    seo_description     varchar(400),
    seo_keywords        varchar(300),
    booking_enabled     boolean      not null default true
);

-- Give every existing organization a default (unpublished) website config.
insert into website_configs (organization_id)
select id from organizations
where id not in (select organization_id from website_configs);

create table website_services (
    id               bigserial primary key,
    organization_id  bigint       not null references organizations(id) on delete cascade,
    name             varchar(120) not null,
    description      varchar(500),
    icon_name        varchar(40),
    sort_order       integer      not null default 0,
    active           boolean      not null default true
);
create index idx_website_services_org on website_services(organization_id);

create table website_gallery_images (
    id               bigserial primary key,
    organization_id  bigint       not null references organizations(id) on delete cascade,
    image_url        varchar(500) not null,
    caption          varchar(200),
    sort_order       integer      not null default 0
);
create index idx_website_gallery_org on website_gallery_images(organization_id);

create table website_testimonials (
    id               bigserial primary key,
    organization_id  bigint       not null references organizations(id) on delete cascade,
    patient_name     varchar(120) not null,
    message          varchar(1000) not null,
    rating           integer      not null default 5,
    photo_url        varchar(400),
    sort_order       integer      not null default 0,
    published        boolean      not null default true
);
create index idx_website_testimonials_org on website_testimonials(organization_id);

create table website_blog_posts (
    id                bigserial primary key,
    organization_id   bigint       not null references organizations(id) on delete cascade,
    title             varchar(200) not null,
    slug              varchar(220) not null,
    excerpt           varchar(400),
    content           varchar(8000) not null,
    cover_image_url   varchar(500),
    author            varchar(120),
    published         boolean      not null default false,
    created_at        timestamptz  not null default now(),
    published_at      timestamptz
);
create unique index uq_website_blog_slug on website_blog_posts(organization_id, slug);

create table website_contact_submissions (
    id               bigserial primary key,
    organization_id  bigint       not null references organizations(id) on delete cascade,
    name             varchar(160) not null,
    email            varchar(180) not null,
    phone            varchar(30),
    message          varchar(2000) not null,
    status           varchar(20)  not null default 'NEW',
    created_at       timestamptz  not null default now()
);
create index idx_website_contact_org on website_contact_submissions(organization_id);
