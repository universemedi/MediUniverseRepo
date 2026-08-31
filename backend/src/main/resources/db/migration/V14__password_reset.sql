-- MediUnivers — Forgot/Reset password (req #4)
-- Separate from app_users.invite_token on purpose: that field only makes
-- sense while status == INVITED (UserInvitationService.accept() guards on
-- exactly that), so a returning ACTIVE user who forgets their password needs
-- its own token pair instead of colliding with the invite flow.

alter table app_users add column reset_token varchar(100);
alter table app_users add column reset_token_expires_at timestamptz;
create unique index uq_app_users_reset_token on app_users(reset_token) where reset_token is not null;

-- NotificationTemplateService.seedDefaults() is a no-op once an org already
-- has templates, so every org that existed before this migration needs its
-- PASSWORD_RESET_REQUESTED template backfilled by hand — otherwise
-- NotificationService.notify() would silently find nothing to send.
insert into notification_templates (organization_id, event_type, channel, category, name, subject, body, supported_variables, active)
select o.id, 'PASSWORD_RESET_REQUESTED', 'EMAIL', 'AUTH', 'Password reset requested',
       'Reset your MediUnivers password',
       'Hello {{fullName}},

We received a request to reset your password. Reset it here: {{resetLink}}

This link expires on {{expiresAt}}. If you did not request this, you can safely ignore this email.

Thank you.',
       'fullName,resetLink,expiresAt', true
from organizations o
where not exists (
    select 1 from notification_templates nt
    where nt.organization_id = o.id and nt.event_type = 'PASSWORD_RESET_REQUESTED' and nt.channel = 'EMAIL'
);
