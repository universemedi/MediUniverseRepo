-- MediUnivers — per-module pricing for customer-built "custom plans"
-- When none of the fixed plans fit, a customer can build their own by
-- picking modules; the price is the sum of each selected module's
-- per-month rate (super-admin configurable here), same 18% GST rate as
-- every other plan.

create table module_prices (
    id                bigserial primary key,
    module_group      varchar(20)   not null unique,
    price_per_month   numeric(12,2) not null default 0,
    active            boolean       not null default true,
    updated_at        timestamptz   not null default now()
);

insert into module_prices (module_group, price_per_month) values
    ('CLINIC', 1999),
    ('PHARMACY', 1499),
    ('LAB', 1499),
    ('CRM', 999),
    ('CMS', 999);
