create table lab_packages (
    id               bigserial primary key,
    organization_id  bigint        not null references organizations(id) on delete cascade,
    name             varchar(160)  not null,
    price            numeric(10,2) not null,
    discount_percent numeric(5,2)  not null default 0,
    status           varchar(20)   not null default 'ACTIVE'
);
create index idx_lab_packages_organization_id on lab_packages(organization_id);

create table lab_package_tests (
    package_id bigint not null references lab_packages(id) on delete cascade,
    test_id    bigint not null references lab_tests(id) on delete cascade,
    primary key (package_id, test_id)
);
