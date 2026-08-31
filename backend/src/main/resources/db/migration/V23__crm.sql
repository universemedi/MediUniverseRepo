create table crm_lead_sources (
    id              bigserial primary key,
    organization_id bigint      not null references organizations(id) on delete cascade,
    code            varchar(30) not null,
    name            varchar(120) not null,
    status          varchar(20) not null default 'ACTIVE'
);
create index idx_crm_lead_sources_org on crm_lead_sources(organization_id);

create table crm_leads (
    id              bigserial primary key,
    organization_id bigint       not null references organizations(id) on delete cascade,
    name            varchar(160) not null,
    phone           varchar(30)  not null,
    email           varchar(180),
    source_id       bigint       references crm_lead_sources(id) on delete set null,
    owner_user_id   bigint       references app_users(id) on delete set null,
    value           numeric(10,2) not null default 0,
    status          varchar(20)  not null default 'NEW_LEAD',
    created_at      timestamptz  not null default now()
);
create index idx_crm_leads_org on crm_leads(organization_id);

create table crm_follow_ups (
    id            bigserial primary key,
    lead_id       bigint       not null references crm_leads(id) on delete cascade,
    type          varchar(20)  not null default 'CALL',
    owner_user_id bigint       references app_users(id) on delete set null,
    due_date      date         not null,
    notes         varchar(500),
    status        varchar(20)  not null default 'PENDING'
);
create index idx_crm_follow_ups_lead on crm_follow_ups(lead_id);

create table crm_activities (
    id            bigserial primary key,
    lead_id       bigint       not null references crm_leads(id) on delete cascade,
    activity_type varchar(20)  not null default 'NOTE',
    owner_user_id bigint       references app_users(id) on delete set null,
    notes         varchar(500),
    created_at    timestamptz  not null default now()
);
create index idx_crm_activities_lead on crm_activities(lead_id);
