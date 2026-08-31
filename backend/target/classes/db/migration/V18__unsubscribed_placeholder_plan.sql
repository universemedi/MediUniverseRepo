-- MediUnivers — separate account creation from plan purchase
-- The public "create your organization" step now happens before any plan is
-- chosen. organizations.plan_id stays NOT NULL (avoids a much larger ripple
-- of null-plan handling across effectiveModules(), branch/doctor limits,
-- AccessService, DtoMapper, JWT claims, and the frontend's PlanApiDto type),
-- so a brand-new account gets this reserved, non-public placeholder plan
-- instead: zero modules, zero branch/doctor limits, never returned by
-- GET /api/public/plans (active=false) — it grants no real product access at
-- all until the owner actually picks and pays for a real plan, at which
-- point Organization.plan is overwritten with the real one.

insert into plans (code, name, price_label, tagline, max_branches, max_users, storage_label, sort_order,
                    price_without_tax, tax_percent, max_doctors_per_branch, is_free_trial, free_trial_days, active)
values ('UNSUBSCRIBED', 'Not Subscribed', 'No plan selected', 'Account created — no plan selected yet.',
        1, 1, '0 GB', 999, 0, 0, 0, false, 0, false);
-- Deliberately no plan_modules rows inserted — an empty module set is what makes this a "no access" placeholder.
