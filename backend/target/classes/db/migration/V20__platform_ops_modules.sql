-- Phase A of "eliminate all frontend mock data": Platform Ops modules that
-- previously fell through to the fake-data catch-all get real tables.

alter table org_types add column active boolean not null default true;

create table platform_modules (
    id       bigserial primary key,
    code     varchar(50)  not null unique,
    name     varchar(120) not null,
    category varchar(30)  not null default 'CORE',
    active   boolean      not null default true
);

create table platform_features (
    id           bigserial primary key,
    code         varchar(50)  not null unique,
    name         varchar(120) not null,
    module_group varchar(20)  not null,
    feature_type varchar(20)  not null default 'BOOLEAN',
    active       boolean      not null default true
);
create index idx_platform_features_module_group on platform_features(module_group);

create table coupons (
    id               bigserial primary key,
    code             varchar(50)  not null unique,
    discount_percent numeric(5,2) not null,
    valid_from       date,
    valid_to         date,
    usage_count      integer      not null default 0,
    active           boolean      not null default true
);

create table coupon_plans (
    coupon_id bigint      not null references coupons(id) on delete cascade,
    plan_code varchar(50) not null
);
create index idx_coupon_plans_coupon_id on coupon_plans(coupon_id);

create table referral_codes (
    id              bigserial primary key,
    code            varchar(50)   not null unique,
    organization_id bigint        not null references organizations(id) on delete cascade,
    reward_amount   numeric(10,2) not null default 0,
    signup_count    integer       not null default 0,
    enabled         boolean       not null default false
);
create index idx_referral_codes_organization_id on referral_codes(organization_id);

create table support_tickets (
    id              bigserial primary key,
    subject         varchar(200) not null,
    organization_id bigint       references organizations(id) on delete cascade,
    priority        varchar(20)  not null default 'MEDIUM',
    owner_user_id   bigint       references app_users(id) on delete set null,
    status          varchar(20)  not null default 'OPEN',
    created_at      timestamptz  not null default now()
);
create index idx_support_tickets_organization_id on support_tickets(organization_id);
create index idx_support_tickets_owner_user_id on support_tickets(owner_user_id);

create table audit_logs (
    id              bigserial primary key,
    actor_user_id   bigint      references app_users(id) on delete set null,
    action          varchar(30) not null,
    entity_type     varchar(60) not null,
    entity_id       varchar(60),
    organization_id bigint      references organizations(id) on delete set null,
    ip_address      varchar(64),
    created_at      timestamptz not null default now()
);
create index idx_audit_logs_organization_id on audit_logs(organization_id);
create index idx_audit_logs_created_at on audit_logs(created_at);
