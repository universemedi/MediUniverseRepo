-- Platform-level Communication Engine: MediUnivers' own outgoing email/SMS,
-- separate from each organization's own (per-org) provider config in
-- notification_templates/notifications. Needed because account-security
-- emails (invite, password reset) must go out from MediUnivers itself —
-- a brand-new organization has no SMTP configured yet to send its own
-- owner's very first invite email.

create table platform_communication_settings (
    id                bigserial primary key,
    email_enabled     boolean      not null default true,
    email_config_json varchar(2000),
    sms_enabled       boolean      not null default false,
    sms_config_json   varchar(2000),
    created_at        timestamptz  not null default now(),
    updated_at        timestamptz  not null default now()
);

create table platform_notification_templates (
    id                   bigserial primary key,
    event_type           varchar(40)  not null,
    channel              varchar(20)  not null,
    name                 varchar(160) not null,
    subject              varchar(200),
    body                 varchar(4000) not null,
    supported_variables  varchar(500),
    active               boolean      not null default true,
    created_at           timestamptz  not null default now(),
    updated_at           timestamptz  not null default now(),
    constraint uq_platform_notification_template_event_channel unique (event_type, channel)
);

create table platform_notifications (
    id                bigserial primary key,
    event_type        varchar(40)  not null,
    channel           varchar(20)  not null,
    priority          varchar(20)  not null default 'NORMAL',
    status            varchar(20)  not null default 'PENDING',
    recipient_name    varchar(160),
    recipient_email   varchar(180),
    recipient_phone   varchar(30),
    recipient_user_id bigint,
    subject           varchar(200),
    body              varchar(4000) not null,
    reference_type    varchar(40),
    reference_id      bigint,
    scheduled_for     timestamptz,
    retry_count       integer      not null default 0,
    max_retries       integer      not null default 3,
    next_retry_at     timestamptz,
    error_message     varchar(1000),
    created_at        timestamptz  not null default now(),
    sent_at           timestamptz
);
create index idx_platform_notifications_status_scheduled on platform_notifications(status, scheduled_for);
create index idx_platform_notifications_created on platform_notifications(created_at);
