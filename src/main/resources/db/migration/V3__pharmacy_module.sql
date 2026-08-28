-- MediUnivers — Pharmacy Module (Volume 4)

alter table consultations add column pharmacy_status varchar(20) not null default 'NONE';
create index idx_consultations_pharmacy_status on consultations(pharmacy_status);

-- ===================== Master data additions =====================

create table medicine_categories (
    id               bigserial primary key,
    organization_id  bigint       references organizations(id) on delete cascade,
    code             varchar(20)  not null,
    name             varchar(120) not null,
    status           varchar(20)  not null default 'ACTIVE'
);
create unique index uq_medicine_categories_platform on medicine_categories(code) where organization_id is null;
create unique index uq_medicine_categories_org on medicine_categories(organization_id, code) where organization_id is not null;

create table medicine_units (
    id               bigserial primary key,
    organization_id  bigint       references organizations(id) on delete cascade,
    code             varchar(20)  not null,
    name             varchar(120) not null,
    status           varchar(20)  not null default 'ACTIVE'
);
create unique index uq_medicine_units_platform on medicine_units(code) where organization_id is null;
create unique index uq_medicine_units_org on medicine_units(organization_id, code) where organization_id is not null;

create table manufacturers (
    id               bigserial primary key,
    organization_id  bigint       references organizations(id) on delete cascade,
    code             varchar(20)  not null,
    name             varchar(120) not null,
    status           varchar(20)  not null default 'ACTIVE'
);
create unique index uq_manufacturers_platform on manufacturers(code) where organization_id is null;
create unique index uq_manufacturers_org on manufacturers(organization_id, code) where organization_id is not null;

-- ============================ Core pharmacy ============================

create table suppliers (
    id               bigserial primary key,
    organization_id  bigint       not null references organizations(id) on delete cascade,
    name             varchar(160) not null,
    contact_name     varchar(120),
    phone            varchar(30),
    email            varchar(180),
    address          varchar(300),
    gst_number       varchar(30),
    status           varchar(20)  not null default 'ACTIVE'
);
create index idx_suppliers_organization on suppliers(organization_id);

create table medicines (
    id                  bigserial primary key,
    organization_id     bigint       not null references organizations(id) on delete cascade,
    code                varchar(30)  not null,
    name                varchar(160) not null,
    category_id         bigint       references medicine_categories(id),
    unit_id             bigint       references medicine_units(id),
    manufacturer_id     bigint       references manufacturers(id),
    hsn_code            varchar(20),
    tax_percent         numeric(5,2) not null default 0,
    reorder_level       integer      not null default 10,
    controlled          boolean      not null default false,
    allow_substitution  boolean      not null default true,
    status              varchar(20)  not null default 'ACTIVE',
    unique (organization_id, code)
);
create index idx_medicines_organization on medicines(organization_id);
create index idx_medicines_name on medicines(organization_id, name);

create table batches (
    id                  bigserial primary key,
    organization_id     bigint       not null references organizations(id) on delete cascade,
    branch_id           bigint       not null references branches(id),
    medicine_id         bigint       not null references medicines(id),
    supplier_id         bigint       references suppliers(id),
    batch_number        varchar(60)  not null,
    expiry_date         date         not null,
    purchase_price      numeric(10,2) not null,
    mrp                 numeric(10,2) not null,
    quantity_received   integer      not null,
    quantity_available  integer      not null,
    received_at         timestamptz  not null default now()
);
create index idx_batches_medicine_branch on batches(medicine_id, branch_id);
create index idx_batches_expiry on batches(expiry_date);

create table purchase_orders (
    id               bigserial primary key,
    organization_id  bigint      not null references organizations(id) on delete cascade,
    branch_id        bigint      not null references branches(id),
    supplier_id      bigint      not null references suppliers(id),
    po_number        varchar(30) not null,
    status           varchar(20) not null default 'DRAFT',
    created_at       timestamptz not null default now()
);
create index idx_po_organization on purchase_orders(organization_id);

create table purchase_order_items (
    id                 bigserial primary key,
    purchase_order_id  bigint       not null references purchase_orders(id) on delete cascade,
    medicine_id        bigint       not null references medicines(id),
    quantity_ordered   integer      not null,
    quantity_received  integer      not null default 0,
    rate               numeric(10,2) not null
);

create table goods_receipts (
    id                  bigserial primary key,
    organization_id     bigint      not null references organizations(id) on delete cascade,
    branch_id           bigint      not null references branches(id),
    purchase_order_id   bigint      references purchase_orders(id),
    supplier_id         bigint      not null references suppliers(id),
    grn_number          varchar(30) not null,
    received_at         timestamptz not null default now()
);
create index idx_grn_organization on goods_receipts(organization_id);

create table goods_receipt_items (
    id                bigserial primary key,
    goods_receipt_id  bigint       not null references goods_receipts(id) on delete cascade,
    medicine_id       bigint       not null references medicines(id),
    batch_number      varchar(60)  not null,
    expiry_date       date         not null,
    quantity          integer      not null,
    purchase_price    numeric(10,2) not null,
    mrp               numeric(10,2) not null
);

create table stock_ledger_entries (
    id                bigserial primary key,
    organization_id   bigint      not null references organizations(id) on delete cascade,
    branch_id         bigint      not null references branches(id),
    medicine_id       bigint      not null references medicines(id),
    batch_id          bigint      references batches(id),
    type              varchar(20) not null,
    quantity          integer     not null,
    balance_after     integer     not null,
    reference_type    varchar(30),
    reference_id      bigint,
    created_at        timestamptz not null default now()
);
create index idx_ledger_medicine_branch on stock_ledger_entries(medicine_id, branch_id);
create index idx_ledger_created_at on stock_ledger_entries(created_at);

create table stock_transfers (
    id                bigserial primary key,
    organization_id   bigint      not null references organizations(id) on delete cascade,
    from_branch_id    bigint      not null references branches(id),
    to_branch_id      bigint      not null references branches(id),
    transfer_number   varchar(30) not null,
    created_at        timestamptz not null default now()
);

create table stock_transfer_items (
    id                 bigserial primary key,
    stock_transfer_id  bigint not null references stock_transfers(id) on delete cascade,
    medicine_id        bigint not null references medicines(id),
    quantity           integer not null
);

create table pharmacy_sales (
    id                bigserial primary key,
    organization_id   bigint       not null references organizations(id) on delete cascade,
    branch_id         bigint       not null references branches(id),
    type              varchar(20)  not null default 'WALK_IN',
    status            varchar(20)  not null default 'COMPLETED',
    sale_number       varchar(30)  not null,
    patient_id        bigint       references patients(id),
    consultation_id   bigint       references consultations(id),
    subtotal          numeric(10,2) not null default 0,
    discount_total    numeric(10,2) not null default 0,
    tax_total         numeric(10,2) not null default 0,
    grand_total       numeric(10,2) not null default 0,
    payment_mode      varchar(20)  not null default 'CASH',
    created_at        timestamptz  not null default now()
);
create index idx_sales_organization on pharmacy_sales(organization_id);
create index idx_sales_consultation on pharmacy_sales(consultation_id);

create table pharmacy_sale_items (
    id                 bigserial primary key,
    sale_id            bigint       not null references pharmacy_sales(id) on delete cascade,
    medicine_id        bigint       not null references medicines(id),
    batch_id           bigint       not null references batches(id),
    quantity           integer      not null,
    quantity_returned  integer      not null default 0,
    mrp                numeric(10,2) not null,
    discount           numeric(10,2) not null default 0,
    tax_percent        numeric(5,2) not null default 0,
    line_total         numeric(10,2) not null
);

create table pharmacy_returns (
    id               bigserial primary key,
    organization_id  bigint       not null references organizations(id) on delete cascade,
    sale_id          bigint       not null references pharmacy_sales(id),
    return_number    varchar(30)  not null,
    reason           varchar(200) not null,
    refund_mode      varchar(20)  not null,
    status           varchar(20)  not null default 'COMPLETED',
    refund_amount    numeric(10,2) not null default 0,
    created_at       timestamptz  not null default now()
);

create table pharmacy_return_items (
    id             bigserial primary key,
    return_id      bigint not null references pharmacy_returns(id) on delete cascade,
    sale_item_id   bigint not null references pharmacy_sale_items(id),
    quantity       integer not null,
    amount         numeric(10,2) not null
);
