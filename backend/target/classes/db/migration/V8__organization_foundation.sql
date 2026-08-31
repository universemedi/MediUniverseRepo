-- MediUnivers — Organization, Branch, Department & User Foundation
-- (Organization Foundation spec: org lifecycle, org settings, multi-branch,
-- department-under-branch readiness, user invitations, branch assignment)

create sequence organization_code_seq;
-- Align the sequence past any already-backfilled codes (which reused the numeric
-- primary key) so newly generated codes can never collide with them.
select case
           when max(id) is null then setval('organization_code_seq', 1, false)
           else setval('organization_code_seq', max(id), true)
           end
from organizations;
-- ===================== Organizations: identity + profile =====================

alter table organizations add column organization_code varchar(20);
alter table organizations add column slug varchar(180);
alter table organizations add column creation_source varchar(20) not null default 'SUPER_ADMIN';
alter table organizations add column email varchar(180);
alter table organizations add column phone varchar(30);
alter table organizations add column address_line1 varchar(200);
alter table organizations add column address_line2 varchar(200);
alter table organizations add column city varchar(100);
alter table organizations add column state varchar(100);
alter table organizations add column country varchar(100);
alter table organizations add column postal_code varchar(20);
alter table organizations add column timezone varchar(60) not null default 'Asia/Kolkata';
alter table organizations add column currency varchar(10) not null default 'INR';
alter table organizations add column language varchar(10) not null default 'en';
alter table organizations add column gst_number varchar(30);
alter table organizations add column registration_number varchar(60);
alter table organizations add column website varchar(200);
alter table organizations add column logo_url varchar(400);

-- Backfill any organization created before this migration (e.g. the seeded demo org)
-- with a generated code/slug so the NOT NULL + UNIQUE constraints below can be applied safely.
update organizations
   set organization_code = 'ORG-' || lpad(id::text, 6, '0')
 where organization_code is null;

update organizations
   set slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) || '-' || id
 where slug is null;

alter table organizations alter column organization_code set not null;
alter table organizations alter column slug set not null;
create unique index uq_organizations_code on organizations(organization_code);
create unique index uq_organizations_slug on organizations(slug);

-- The full lifecycle now has 8 states instead of 4 — existing statuses map onto it
-- unchanged (TRIAL/ACTIVE/SUSPENDED already match; PAST_DUE becomes GRACE_PERIOD,
-- which is what it always meant: lapsed but still temporarily accessible).
update organizations set status = 'GRACE_PERIOD' where status = 'PAST_DUE';

-- One settings row per organization.
create table organization_settings (
    id                            bigserial primary key,
    organization_id               bigint       not null unique references organizations(id) on delete cascade,
    date_format                   varchar(20)  not null default 'DD-MM-YYYY',
    time_format                   varchar(10)  not null default '12_HOUR',
    appointment_slot_minutes      integer      not null default 15,
    appointment_buffer_minutes    integer      not null default 5,
    allow_overbooking             boolean      not null default false,
    business_hours_json           varchar(2000),
    email_notifications_enabled   boolean      not null default true,
    sms_notifications_enabled     boolean      not null default false
);

-- Give every existing organization a default settings row too.
insert into organization_settings (organization_id)
select id from organizations
where id not in (select organization_id from organization_settings);

-- ===================== Branches: lifecycle + per-branch modules =====================

alter table branches add column status varchar(20) not null default 'ACTIVE';
alter table branches add column email varchar(180);
alter table branches add column phone varchar(30);
alter table branches add column address_line1 varchar(200);
alter table branches add column city varchar(100);
alter table branches add column state varchar(100);
alter table branches add column country varchar(100);
alter table branches add column postal_code varchar(20);

create table branch_modules (
    branch_id     bigint      not null references branches(id) on delete cascade,
    module_group  varchar(20) not null,
    primary key (branch_id, module_group)
);

-- ===================== Users: invitations + branch scope =====================

alter table app_users add column branch_scope varchar(20) not null default 'ALL_BRANCHES';
alter table app_users add column invite_token varchar(100);
alter table app_users add column invite_expires_at timestamptz;
create unique index uq_app_users_invite_token on app_users(invite_token) where invite_token is not null;

create table user_branches (
    user_id    bigint not null references app_users(id) on delete cascade,
    branch_id  bigint not null references branches(id) on delete cascade,
    primary key (user_id, branch_id)
);
