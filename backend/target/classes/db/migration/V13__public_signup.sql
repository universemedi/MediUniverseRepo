-- MediUnivers — Public self-serve signup (req #3, #5, #6)
-- A public, unauthenticated client proves ownership of a DRAFT organization
-- across the two-step subscribe flow (create -> pay) using this short-lived
-- token instead of a session. Cleared the moment the org leaves DRAFT.

alter table organizations add column signup_token varchar(100);
create unique index uq_organizations_signup_token on organizations(signup_token) where signup_token is not null;

-- Subscriptions created mid-signup (before payment) start PENDING_PAYMENT with
-- no end date — end_date is already nullable (V11) and is only set once
-- payment is confirmed and the subscription becomes ACTIVE.
