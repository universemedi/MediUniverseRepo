-- MediUnivers — Master Data Engine + Clinic Module (Volume 3 Part 3 & Part 4)

-- =========================== Master Data Engine ===========================

create table departments (
    id               bigserial primary key,
    organization_id  bigint       not null references organizations(id) on delete cascade,
    code             varchar(20)  not null,
    name             varchar(120) not null,
    status           varchar(20)  not null default 'ACTIVE',
    unique (organization_id, code)
);

-- organization_id NULL = platform default (read-only to organizations), matching
-- "Platform Masters are read-only for organizations" (business rule).
create table specializations (
    id               bigserial primary key,
    organization_id  bigint       references organizations(id) on delete cascade,
    code             varchar(20)  not null,
    name             varchar(120) not null,
    status           varchar(20)  not null default 'ACTIVE'
);
create unique index uq_specializations_platform on specializations(code) where organization_id is null;
create unique index uq_specializations_org on specializations(organization_id, code) where organization_id is not null;

create table number_series (
    id               bigserial primary key,
    organization_id  bigint       not null references organizations(id) on delete cascade,
    code             varchar(40)  not null,
    prefix           varchar(10)  not null,
    current_number   bigint       not null default 0,
    padding          integer      not null default 6,
    reset_policy     varchar(20)  not null default 'NEVER',
    last_reset_on    date,
    unique (organization_id, code)
);

-- ================================ Clinic ===================================

create table patients (
    id               bigserial primary key,
    organization_id  bigint       not null references organizations(id) on delete cascade,
    branch_id        bigint       references branches(id),
    patient_number   varchar(30)  not null,
    first_name       varchar(80)  not null,
    last_name        varchar(80),
    gender           varchar(10),
    date_of_birth    date,
    phone            varchar(30),
    email            varchar(180),
    blood_group      varchar(5),
    address          varchar(300),
    status           varchar(20)  not null default 'ACTIVE',
    created_at       timestamptz  not null default now(),
    unique (organization_id, patient_number)
);
create index idx_patients_organization on patients(organization_id);
create index idx_patients_phone on patients(phone);

create table family_members (
    id              bigserial primary key,
    patient_id      bigint       not null references patients(id) on delete cascade,
    name            varchar(120) not null,
    relation        varchar(30)  not null,
    gender          varchar(10),
    date_of_birth   date,
    phone           varchar(30)
);

create table doctors (
    id                  bigserial primary key,
    organization_id     bigint       not null references organizations(id) on delete cascade,
    branch_id           bigint       references branches(id),
    app_user_id         bigint       references app_users(id),
    full_name           varchar(160) not null,
    qualification       varchar(120),
    experience_years    integer,
    consultation_fee    numeric(10,2),
    status              varchar(20)  not null default 'ACTIVE'
);
create index idx_doctors_organization on doctors(organization_id);

create table doctor_specializations (
    doctor_id          bigint not null references doctors(id) on delete cascade,
    specialization_id  bigint not null references specializations(id) on delete cascade,
    primary key (doctor_id, specialization_id)
);

create table doctor_availability (
    id            bigserial primary key,
    doctor_id     bigint      not null references doctors(id) on delete cascade,
    day_of_week   varchar(10) not null,
    start_time    time        not null,
    end_time      time        not null,
    slot_minutes  integer     not null default 15
);
create index idx_availability_doctor on doctor_availability(doctor_id);

create table appointments (
    id                  bigserial primary key,
    organization_id     bigint       not null references organizations(id) on delete cascade,
    branch_id           bigint       references branches(id),
    patient_id          bigint       not null references patients(id),
    doctor_id           bigint       not null references doctors(id),
    appointment_number  varchar(30)  not null,
    token_number        varchar(10),
    type                varchar(20)  not null default 'SCHEDULED',
    status              varchar(20)  not null default 'BOOKED',
    appointment_date    date         not null,
    scheduled_at        timestamptz,
    reason              varchar(500),
    created_at          timestamptz  not null default now(),
    checked_in_at       timestamptz,
    completed_at        timestamptz
);
create index idx_appointments_organization on appointments(organization_id);
create index idx_appointments_doctor_date on appointments(doctor_id, appointment_date);
create index idx_appointments_patient on appointments(patient_id);

create table consultations (
    id                  bigserial primary key,
    organization_id     bigint       not null references organizations(id) on delete cascade,
    appointment_id      bigint       not null unique references appointments(id),
    patient_id          bigint       not null references patients(id),
    doctor_id           bigint       not null references doctors(id),
    status              varchar(20)  not null default 'IN_PROGRESS',
    chief_complaint     varchar(500),
    clinical_notes      varchar(4000),
    diagnosis           varchar(500),
    height_cm           numeric(6,2),
    weight_kg           numeric(6,2),
    temperature_f       numeric(5,2),
    blood_pressure      varchar(20),
    pulse_bpm           integer,
    spo2_percent        integer,
    follow_up_date      date,
    follow_up_notes     varchar(500),
    started_at          timestamptz  not null default now(),
    completed_at        timestamptz
);
create index idx_consultations_patient on consultations(patient_id);
create index idx_consultations_doctor on consultations(doctor_id);

create table prescription_items (
    consultation_id  bigint       not null references consultations(id) on delete cascade,
    medicine_name    varchar(160) not null,
    dosage           varchar(60),
    frequency        varchar(60),
    duration         varchar(60),
    instructions     varchar(300)
);
create index idx_prescription_items_consultation on prescription_items(consultation_id);
