-- Phone and date of birth for any user's profile (platform staff, tenant staff, patients) —
-- optional, settable by an admin creating/editing the account or by the user themselves
-- from their own profile page.
alter table app_users add column phone varchar(20);
alter table app_users add column date_of_birth date;
