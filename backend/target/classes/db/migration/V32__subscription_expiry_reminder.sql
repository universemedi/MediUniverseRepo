-- Tracks whether the one-time "expiring soon" reminder has already gone out
-- for this subscription period, so the daily lifecycle job doesn't resend it
-- on every run during the reminder window.
alter table subscriptions add column expiry_reminder_sent boolean not null default false;
