-- Tracks whether the recipient has seen this notification in their header
-- bell — distinct from delivery `status` (PENDING/SENT/FAILED), which is
-- about whether the email/SMS went out, not whether a person has read it.
alter table notifications add column is_read boolean not null default false;
alter table platform_notifications add column is_read boolean not null default false;
