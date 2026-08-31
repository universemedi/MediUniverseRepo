-- MediUnivers — Phase 1 core schema
-- Organization Type -> which business modules an org can ever use
-- Plan              -> which of those modules are currently paid for
-- Role              -> which pages/actions within unlocked modules a user can use
-- (see RBAC model comment in AccessEvaluator.java for the runtime version of this)

create table org_types (
    id          bigserial primary key,
    code        varchar(50)  not null unique,
    name        varchar(120) not null,
    description varchar(400)
);

create table org_type_modules (
    org_type_id  bigint      not null references org_types(id) on delete cascade,
    module_group varchar(20) not null,
    primary key (org_type_id, module_group)
);

create table plans (
    id            bigserial primary key,
    code          varchar(50)  not null unique,
    name          varchar(120) not null,
    price_label   varchar(60)  not null,
    tagline       varchar(300),
    max_branches  integer      not null default 1,
    max_users     integer      not null default 5,
    storage_label varchar(30)  not null default '1 GB',
    sort_order    integer      not null default 0
);

create table plan_modules (
    plan_id      bigint      not null references plans(id) on delete cascade,
    module_group varchar(20) not null,
    primary key (plan_id, module_group)
);

create table plan_highlights (
    plan_id bigint      not null references plans(id) on delete cascade,
    label   varchar(120) not null
);

create table organizations (
    id           bigserial primary key,
    name         varchar(160) not null,
    subdomain    varchar(80) unique,
    org_type_id  bigint       not null references org_types(id),
    plan_id      bigint       not null references plans(id),
    status       varchar(20)  not null default 'TRIAL',
    renews_on    date,
    created_at   timestamptz  not null default now(),
    updated_at   timestamptz  not null default now()
);

create table branches (
    id               bigserial primary key,
    organization_id  bigint       not null references organizations(id) on delete cascade,
    name             varchar(120) not null,
    is_head_office   boolean      not null default false,
    created_at       timestamptz  not null default now()
);

-- Roles are dynamic: system roles ship with the product (organization_id is null,
-- usable by any organization); an org admin can also define custom roles scoped
-- to just their organization (organization_id set).
create table roles (
    id               bigserial primary key,
    code             varchar(80)  not null unique,
    name             varchar(120) not null,
    portal           varchar(20)  not null,
    description      varchar(300),
    is_system        boolean      not null default true,
    organization_id  bigint       references organizations(id) on delete cascade,
    created_at       timestamptz  not null default now()
);

create table role_actions (
    role_id bigint      not null references roles(id) on delete cascade,
    action  varchar(20) not null,
    primary key (role_id, action)
);

-- One row per module group a role can touch. wildcard = true means "every page
-- in this group"; otherwise the exact pages are listed in role_access_paths.
create table role_group_access (
    id            bigserial primary key,
    role_id       bigint      not null references roles(id) on delete cascade,
    module_group  varchar(20) not null,
    wildcard      boolean     not null default false,
    unique (role_id, module_group)
);

create table role_access_paths (
    role_group_access_id bigint       not null references role_group_access(id) on delete cascade,
    path                 varchar(120) not null,
    primary key (role_group_access_id, path)
);

create table app_users (
    id             bigserial primary key,
    email          varchar(180) not null unique,
    password_hash  varchar(200) not null,
    full_name      varchar(160) not null,
    portal         varchar(20)  not null,
    role_id        bigint       not null references roles(id),
    organization_id bigint      references organizations(id) on delete cascade,
    branch_id      bigint       references branches(id),
    status         varchar(20)  not null default 'ACTIVE',
    created_at     timestamptz  not null default now(),
    updated_at     timestamptz  not null default now()
);

create index idx_app_users_organization on app_users(organization_id);
create index idx_branches_organization on branches(organization_id);
create index idx_roles_organization on roles(organization_id);

-- Public-website lead capture (Contact / Request Demo / Free Trial / Pricing Enquiry)
-- — every one of these forms feeds the same table per the product spec.
create table leads (
    id                 bigserial primary key,
    source             varchar(40)  not null,
    name               varchar(160) not null,
    email              varchar(180) not null,
    phone              varchar(40),
    organization_name  varchar(160),
    organization_type  varchar(40),
    city               varchar(120),
    expected_branches  integer,
    message            varchar(2000),
    status             varchar(30)  not null default 'NEW_LEAD',
    created_at         timestamptz  not null default now()
);

create index idx_leads_status on leads(status);
