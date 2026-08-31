-- MediUnivers — Communication & Notification Engine (Volume 3, Part 6)
-- Organization-scoped only for this pass (subscription-lifecycle reminders
-- are excluded — that flow isn't implemented yet). Relational adaptation of
-- the spec's Mongo collections: one `notifications` table serves as both the
-- queue and the log (a "queue" is just its PENDING/QUEUED rows), and
-- templates are owned per-organization so they're dynamically editable from
-- the org dashboard rather than a shared platform default.

-- ===================== Per-organization channel settings =====================

create table organization_communication_settings (
    id                     bigserial primary key,
    organization_id        bigint       not null unique references organizations(id) on delete cascade,
    email_enabled           boolean      not null default true,
    email_provider           varchar(30)  not null default 'SMTP',
    email_config_json        varchar(2000),
    sms_enabled              boolean      not null default false,
    sms_provider             varchar(30)  not null default 'LOCAL_GATEWAY',
    sms_config_json          varchar(2000),
    whatsapp_enabled         boolean      not null default false,
    whatsapp_provider        varchar(30)  not null default 'WHATSAPP_CLOUD_API',
    whatsapp_config_json     varchar(2000),
    in_app_enabled           boolean      not null default true
);

-- ===================== Per-organization, dynamically editable templates ======

create table notification_templates (
    id                     bigserial primary key,
    organization_id         bigint       not null references organizations(id) on delete cascade,
    event_type               varchar(40)  not null,
    channel                  varchar(20)  not null,
    category                 varchar(20)  not null,
    name                     varchar(160) not null,
    subject                  varchar(200),
    body                     varchar(4000) not null,
    supported_variables      varchar(500),
    active                   boolean      not null default true,
    created_at               timestamptz  not null default now(),
    updated_at               timestamptz  not null default now(),
    constraint uq_notification_template_org_event_channel unique (organization_id, event_type, channel)
);
create index idx_notification_templates_org on notification_templates(organization_id);

-- ===================== Queue + log (one relational table, spec §6/§14/§20) ===

create table notifications (
    id                     bigserial primary key,
    organization_id         bigint       not null references organizations(id) on delete cascade,
    event_type               varchar(40)  not null,
    category                 varchar(20)  not null,
    channel                  varchar(20)  not null,
    priority                 varchar(20)  not null default 'NORMAL',
    status                   varchar(20)  not null default 'PENDING',
    recipient_name           varchar(160),
    recipient_email          varchar(180),
    recipient_phone          varchar(30),
    recipient_user_id        bigint,
    subject                  varchar(200),
    body                     varchar(4000) not null,
    reference_type           varchar(40),
    reference_id             bigint,
    scheduled_for            timestamptz,
    retry_count              integer      not null default 0,
    max_retries              integer      not null default 3,
    next_retry_at            timestamptz,
    error_message            varchar(1000),
    created_at               timestamptz  not null default now(),
    sent_at                  timestamptz
);
create index idx_notifications_org_created on notifications(organization_id, created_at);
create index idx_notifications_status_scheduled on notifications(status, scheduled_for);
