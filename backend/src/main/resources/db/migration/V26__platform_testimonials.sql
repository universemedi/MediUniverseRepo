-- Testimonials shown on MediUnivers' own public website (not a tenant's site —
-- see website_testimonials for those). No organization_id: this is platform-wide content.
create table platform_testimonials (
    id bigserial primary key,
    name varchar(120) not null,
    role_company varchar(160),
    message varchar(1000) not null,
    rating int not null default 5,
    photo_url varchar(400),
    sort_order int not null default 0,
    published boolean not null default true
);
