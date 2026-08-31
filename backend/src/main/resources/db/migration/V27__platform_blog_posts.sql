-- Blog posts published on MediUnivers' own public website (not a tenant's site —
-- see website_blog_posts for those). No organization_id: platform-wide content.
create table platform_blog_posts (
    id bigserial primary key,
    title varchar(200) not null,
    slug varchar(220) not null unique,
    excerpt varchar(400),
    content text not null,
    cover_image_url varchar(500),
    author varchar(120),
    published boolean not null default false,
    created_at timestamptz not null default now(),
    published_at timestamptz
);
