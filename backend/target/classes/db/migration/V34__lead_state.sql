-- Pairs with the existing city column — every public lead-capture form that
-- collects a city should collect its state too, so the platform sales team
-- has real location data, not just a free-text city with no context.
alter table leads add column state varchar(120);
