-- MediUnivers — Centralized Billing Engine
-- Every module bills through this: Invoice -> InvoiceLineItem(s) -> Payment(s).
-- A future module just becomes a new SourceModule value and starts calling
-- BillingService; nothing here needs to change for it.

create table invoices (
    id               bigserial primary key,
    organization_id  bigint       not null references organizations(id) on delete cascade,
    branch_id        bigint       references branches(id),
    patient_id       bigint       references patients(id),
    invoice_number   varchar(30)  not null,
    source_module    varchar(20)  not null,
    status           varchar(20)  not null default 'UNPAID',
    subtotal         numeric(10,2) not null default 0,
    discount_total   numeric(10,2) not null default 0,
    tax_total        numeric(10,2) not null default 0,
    grand_total      numeric(10,2) not null default 0,
    amount_paid      numeric(10,2) not null default 0,
    created_at       timestamptz  not null default now()
);
create index idx_invoices_organization on invoices(organization_id);
create index idx_invoices_patient on invoices(patient_id);
create index idx_invoices_status on invoices(organization_id, status);

create table invoice_line_items (
    id           bigserial primary key,
    invoice_id   bigint       not null references invoices(id) on delete cascade,
    description  varchar(200) not null,
    source_type  varchar(40),
    source_id    bigint,
    quantity     integer      not null default 1,
    unit_price   numeric(10,2) not null,
    discount     numeric(10,2) not null default 0,
    tax_percent  numeric(5,2)  not null default 0,
    line_total   numeric(10,2) not null
);
create index idx_invoice_line_items_invoice on invoice_line_items(invoice_id);

create table payments (
    id               bigserial primary key,
    invoice_id       bigint       not null references invoices(id) on delete cascade,
    payment_number   varchar(30)  not null,
    amount           numeric(10,2) not null,
    mode             varchar(20)  not null,
    reference        varchar(100),
    is_refund        boolean      not null default false,
    note             varchar(200),
    received_by      bigint       references app_users(id),
    received_at      timestamptz  not null default now()
);
create index idx_payments_invoice on payments(invoice_id);

-- Existing Pharmacy sales and Lab orders now generate a real invoice — link back to it.
alter table pharmacy_sales add column invoice_id bigint references invoices(id);
alter table lab_orders add column invoice_id bigint references invoices(id);
