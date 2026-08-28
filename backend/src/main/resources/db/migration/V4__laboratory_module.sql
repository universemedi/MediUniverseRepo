-- MediUnivers — Laboratory Module / LIMS Foundation (Volume 5)

create table lab_test_categories (
    id               bigserial primary key,
    organization_id  bigint       references organizations(id) on delete cascade,
    code             varchar(20)  not null,
    name             varchar(120) not null,
    status           varchar(20)  not null default 'ACTIVE'
);
create unique index uq_lab_categories_platform on lab_test_categories(code) where organization_id is null;
create unique index uq_lab_categories_org on lab_test_categories(organization_id, code) where organization_id is not null;

create table lab_tests (
    id               bigserial primary key,
    organization_id  bigint       not null references organizations(id) on delete cascade,
    code             varchar(30)  not null,
    name             varchar(160) not null,
    category_id      bigint       references lab_test_categories(id),
    department_id    bigint       references departments(id),
    sample_type      varchar(40)  not null,
    price            numeric(10,2) not null,
    tat_hours        integer      not null default 24,
    status           varchar(20)  not null default 'ACTIVE',
    unique (organization_id, code)
);
create index idx_lab_tests_organization on lab_tests(organization_id);

create table lab_reference_ranges (
    id             bigserial primary key,
    test_id        bigint       not null references lab_tests(id) on delete cascade,
    gender         varchar(10),
    age_min        integer,
    age_max        integer,
    min_value      numeric(10,3),
    max_value      numeric(10,3),
    critical_low   numeric(10,3),
    critical_high  numeric(10,3),
    unit           varchar(20)
);
create index idx_lab_ranges_test on lab_reference_ranges(test_id);

create table lab_orders (
    id               bigserial primary key,
    organization_id  bigint      not null references organizations(id) on delete cascade,
    branch_id        bigint      references branches(id),
    patient_id       bigint      not null references patients(id),
    doctor_id        bigint      references doctors(id),
    consultation_id  bigint      references consultations(id),
    order_number     varchar(30) not null,
    status           varchar(20) not null default 'SAMPLE_PENDING',
    created_at       timestamptz not null default now()
);
create index idx_lab_orders_organization on lab_orders(organization_id);
create index idx_lab_orders_patient on lab_orders(patient_id);

create table lab_order_items (
    id        bigserial primary key,
    order_id  bigint       not null references lab_orders(id) on delete cascade,
    test_id   bigint       not null references lab_tests(id),
    price     numeric(10,2) not null
);

create table sample_collections (
    id                 bigserial primary key,
    order_id           bigint       not null references lab_orders(id) on delete cascade,
    collection_number  varchar(30)  not null,
    collected_by       bigint       references app_users(id),
    collected_at       timestamptz  not null default now(),
    sample_types       varchar(200) not null,
    remarks            varchar(300),
    status             varchar(20)  not null default 'COLLECTED'
);
create index idx_sample_collections_order on sample_collections(order_id);

create table lab_results (
    id             bigserial primary key,
    order_item_id  bigint       not null unique references lab_order_items(id) on delete cascade,
    result_value   varchar(100) not null,
    unit           varchar(20),
    remarks        varchar(300),
    flag           varchar(10)  not null default 'UNKNOWN',
    status         varchar(20)  not null default 'ENTERED',
    entered_by     bigint       not null references app_users(id),
    entered_at     timestamptz  not null default now(),
    verified_by    bigint       references app_users(id),
    verified_at    timestamptz
);
