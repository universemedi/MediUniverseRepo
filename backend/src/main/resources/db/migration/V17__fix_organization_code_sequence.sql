-- MediUnivers — fix organization_code_seq drift
-- DataSeeder's demo org is created with a hardcoded 'ORG-000001' code that
-- bypasses organization_code_seq entirely. V8's original alignment ran
-- while the organizations table was still empty (Flyway migrates before the
-- DataSeeder CommandLineRunner ever runs), so on any database where the demo
-- org was seeded before this fix, the sequence is primed to reissue
-- 'ORG-000001' — colliding with uq_organizations_code the first time a real
-- organization is created (platform-created, free-trial or subscribe).
-- Realign it to the highest numeric suffix actually in use.

do $$
declare
    max_num bigint;
begin
    select max(substring(organization_code from 5)::bigint) into max_num from organizations;
    if max_num is null then
        perform setval('organization_code_seq', 1, false);
    else
        perform setval('organization_code_seq', max_num, true);
    end if;
end $$;
