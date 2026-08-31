-- Shared, real backing table for the "reports" pages across Clinic/Pharmacy/CRM
-- (clinic/reports, pharmacy/reports, crm/reports) — a saved report definition,
-- not a live BI/aggregation engine (see the mock-data-elimination plan).
create table saved_reports (
    id            bigserial primary key,
    organization_id bigint      not null references organizations(id) on delete cascade,
    module_group  varchar(20)  not null,
    name          varchar(160) not null,
    category      varchar(30)  not null,
    period        varchar(20)  not null default 'MONTHLY',
    status        varchar(20)  not null default 'READY',
    generated_at  timestamptz  not null default now()
);
create index idx_saved_reports_org_module on saved_reports(organization_id, module_group);
