-- MediUnivers — Subscription Engine
-- Plan gains real numeric pricing (with/without tax), a per-branch doctor
-- limit, a free-trial flag/length, and an active flag for soft-delete.
-- Subscription is new: one row per organization per subscription period,
-- carrying its own start/end date and a price snapshot independent of
-- whatever the Plan catalog row looks like later. Organization.plan /
-- renewsOn stay as a denormalized pointer to whichever Subscription is
-- currently ACTIVE — every existing read path keeps working unchanged.

alter table plans add column price_without_tax numeric(12,2) not null default 0;
alter table plans add column tax_percent numeric(5,2) not null default 0;
alter table plans add column max_doctors_per_branch integer not null default 999;
alter table plans add column is_free_trial boolean not null default false;
alter table plans add column free_trial_days integer not null default 0;
alter table plans add column active boolean not null default true;

-- Backfill the four seeded plans' numeric pricing from what DataSeeder shipped
-- as human-readable label strings, so existing databases don't sit at the
-- placeholder default once this migration runs.
update plans set price_without_tax = 0,     tax_percent = 0,  max_doctors_per_branch = 5,   is_free_trial = true, free_trial_days = 14 where code = 'TRIAL';
update plans set price_without_tax = 2999,  tax_percent = 18, max_doctors_per_branch = 10                                          where code = 'STARTER';
update plans set price_without_tax = 7999,  tax_percent = 18, max_doctors_per_branch = 25                                          where code = 'PROFESSIONAL';
update plans set price_without_tax = 0,     tax_percent = 18, max_doctors_per_branch = 999                                         where code = 'ENTERPRISE';

create table subscriptions (
    id                  bigserial primary key,
    organization_id     bigint       not null references organizations(id) on delete cascade,
    plan_id             bigint       not null references plans(id),
    plan_code_snapshot  varchar(50)  not null,
    plan_name_snapshot  varchar(120) not null,
    start_date          date         not null,
    end_date            date,
    is_free_trial       boolean      not null default false,
    free_trial_days     integer,
    price_without_tax   numeric(12,2) not null default 0,
    tax_percent         numeric(5,2)  not null default 0,
    price_with_tax      numeric(12,2) not null default 0,
    status              varchar(20)  not null default 'PENDING_PAYMENT',
    payment_gateway     varchar(30),
    gateway_order_id    varchar(100),
    gateway_payment_id  varchar(100),
    created_at          timestamptz  not null default now(),
    updated_at          timestamptz  not null default now()
);

create index idx_subscriptions_org on subscriptions(organization_id);
create index idx_subscriptions_status on subscriptions(status);

-- Backfill one ACTIVE subscription per existing organization, reconstructed
-- from its current plan/renewsOn, so every org has real subscription history
-- from this point forward instead of a gap before this migration ran.
insert into subscriptions (organization_id, plan_id, plan_code_snapshot, plan_name_snapshot,
                            start_date, end_date, is_free_trial, free_trial_days,
                            price_without_tax, tax_percent, price_with_tax, status)
select o.id,
       p.id,
       p.code,
       p.name,
       (coalesce(o.renews_on, current_date) - interval '1 month')::date,
       o.renews_on,
       p.is_free_trial,
       case when p.is_free_trial then p.free_trial_days else null end,
       p.price_without_tax,
       p.tax_percent,
       round(p.price_without_tax * (1 + p.tax_percent / 100), 2),
       case when o.status in ('CANCELLED', 'ARCHIVED') then 'CANCELLED' else 'ACTIVE' end
from organizations o
join plans p on p.id = o.plan_id;
