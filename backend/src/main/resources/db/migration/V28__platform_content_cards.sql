-- Generic marketing-card content for MediUnivers' own public website: feature
-- groups, solution cards, "our values" cards and team/department cards. These
-- four sections share an identical shape (icon, title, short description, an
-- optional bullet list, an optional tag), so one table serves all of them —
-- distinguished by the `section` column — rather than four near-identical tables.
create table platform_content_cards (
    id bigserial primary key,
    section varchar(20) not null,
    icon varchar(60),
    title varchar(160) not null,
    tag varchar(60),
    description varchar(1000),
    bullets_text varchar(2000),
    sort_order int not null default 0,
    published boolean not null default true
);

create index idx_platform_content_cards_section on platform_content_cards(section, sort_order);
