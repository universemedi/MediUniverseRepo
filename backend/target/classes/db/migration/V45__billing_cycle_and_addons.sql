-- Yearly pricing option on top of the existing monthly-only price.
alter table plans add column price_without_tax_yearly numeric(12,2);

-- Which billing cycle a given subscription period was purchased under.
alter table subscriptions add column billing_cycle varchar(10) not null default 'MONTHLY';

-- Super-admin-configured rate per addon type, same pattern as module_prices.
create table addon_pricing (
    id                       bigserial primary key,
    addon_type               varchar(30)   not null unique,
    label                    varchar(120)  not null,
    quantity_based           boolean       not null default false,
    unit_label               varchar(60),
    price_per_unit_monthly   numeric(12,2) not null default 0,
    price_per_unit_yearly    numeric(12,2),
    active                   boolean       not null default true,
    updated_at               timestamptz   not null default now()
);

insert into addon_pricing (addon_type, label, quantity_based, unit_label, price_per_unit_monthly, price_per_unit_yearly) values
    ('SMS', 'SMS Notifications', false, null, 499, 4990),
    ('WHATSAPP', 'WhatsApp Messaging', false, null, 799, 7990),
    ('PAYMENT_GATEWAY', 'Online Payment Collection', false, null, 999, 9990),
    ('EXTRA_CLINIC', 'Extra Branch', true, 'branch', 799, 7990),
    ('EXTRA_DOCTOR', 'Extra Doctor Seat', true, 'doctor per branch', 299, 2990),
    ('EXTRA_STAFF', 'Extra Staff Seat', true, 'user', 199, 1990),
    ('EXTRA_STORAGE', 'Extra Storage', true, '5 GB', 149, 1490);

-- One row per addon a subscription period actually carries — price snapshotted at purchase time,
-- same convention as subscriptions.price_with_tax snapshotting the plan's price.
create table subscription_addons (
    id                        bigserial primary key,
    subscription_id           bigint        not null references subscriptions(id) on delete cascade,
    addon_type                varchar(30)   not null,
    quantity                  int           not null default 1,
    unit_price_without_tax    numeric(12,2) not null,
    unit_price_with_tax       numeric(12,2) not null,
    created_at                timestamptz   not null default now()
);
create index idx_subscription_addons_subscription on subscription_addons(subscription_id);
