-- MediUnivers — Free-trial expiry notification (req #7)
-- Same backfill pattern as V14: NotificationTemplateService.seedDefaults() is
-- a no-op for orgs that already have templates, so every existing org needs
-- its TRIAL_EXPIRED template inserted directly.

insert into notification_templates (organization_id, event_type, channel, category, name, subject, body, supported_variables, active)
select o.id, 'TRIAL_EXPIRED', 'EMAIL', 'AUTH', 'Free trial expired',
       'Your MediUnivers trial has ended',
       'Hello {{fullName}},

Your {{freeTrialDays}}-day free trial for {{organizationName}} has ended. Sign in and pick a plan to keep using MediUnivers: {{plansLink}}

Thank you.',
       'fullName,organizationName,freeTrialDays,plansLink', true
from organizations o
where not exists (
    select 1 from notification_templates nt
    where nt.organization_id = o.id and nt.event_type = 'TRIAL_EXPIRED' and nt.channel = 'EMAIL'
);
