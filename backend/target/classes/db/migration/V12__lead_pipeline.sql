-- MediUnivers — Lead / Demo-Request CRM pipeline (req #2)
-- Turns the existing "leads" table (already fed by every public form) into a
-- real, workable pipeline for platform sales staff: assignment, notes, and
-- the extra fields the Request Demo form actually collects.

alter table leads add column assigned_to_user_id bigint references app_users(id);
alter table leads add column internal_notes varchar(2000);
alter table leads add column expected_users integer;
alter table leads add column modules_of_interest varchar(200);
alter table leads add column preferred_demo_date date;
alter table leads add column updated_at timestamptz not null default now();

-- status stays varchar — @Enumerated(EnumType.STRING) reads/writes the enum's
-- name against the same column with zero migration risk. Existing 'NEW_LEAD'
-- rows already match the new LeadStatus enum's first value.
