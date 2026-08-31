-- MediUnivers — GST/Tax Rule Engine + payment gateway readiness

create table tax_rules (
    id               bigserial primary key,
    organization_id  bigint       references organizations(id) on delete cascade,
    code             varchar(30)  not null,
    name             varchar(60)  not null,
    percentage       numeric(5,2) not null,
    active           boolean      not null default true
);
create unique index uq_tax_rules_platform on tax_rules(code) where organization_id is null;
create unique index uq_tax_rules_org on tax_rules(organization_id, code) where organization_id is not null;

-- Laboratory tests were untaxed — bring them in line with Pharmacy, configurable per test.
alter table lab_tests add column tax_percent numeric(5,2) not null default 0;
alter table lab_order_items add column tax_percent numeric(5,2) not null default 0;

-- Payment gateway readiness: a Payment can now originate from an online gateway
-- (Razorpay today, any other implementation of PaymentGatewayService later) instead of
-- being recorded manually at the counter. gateway_order_id lets a webhook or the
-- verification callback find the payment it corresponds to.
alter table payments add column gateway varchar(30);
alter table payments add column gateway_order_id varchar(100);
alter table payments add column gateway_payment_id varchar(100);
create index idx_payments_gateway_order on payments(gateway_order_id);
