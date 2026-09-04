-- The plan pre-selected on the public site's plan picker — a Super Admin sets this
-- per plan; PlanService enforces that at most one plan is ever true at a time.
alter table plans add column default_selected boolean not null default false;

-- Seed a sensible starting default so the picker always has something selected —
-- the cheapest non-trial catalog plan, if one exists.
update plans set default_selected = true
where id = (
    select id from plans
    where active = true and is_free_trial = false and code not like 'CUSTOM-%' and code <> 'UNSUBSCRIBED'
    order by sort_order asc
    limit 1
);
