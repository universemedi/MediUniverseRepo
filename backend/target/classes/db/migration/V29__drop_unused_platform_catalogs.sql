-- platform_modules and platform_features were a decorative marketing-facing catalog
-- with no code ever reading them — real module/feature gating has always run through
-- OrgType.modules + Plan.modules (see AccessService / usePermissions.ts), not these
-- tables. Removing them rather than leaving dead, confusing admin screens behind.
drop table if exists platform_features;
drop table if exists platform_modules;
