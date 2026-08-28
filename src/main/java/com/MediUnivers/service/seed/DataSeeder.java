package com.MediUnivers.service.seed;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * First-boot seed data: organization types, plans, every system role from the
 * product spec, and one demo organization ("Sunrise Multispeciality") with a
 * platform staff account, a tenant owner account and a patient account so the
 * frontend has something real to log into out of the box.
 *
 * Runs once — every insert is guarded by "does this already exist?" so it's
 * safe to restart the app without duplicating data.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final OrgTypeRepository orgTypeRepository;
    private final PlanRepository planRepository;
    private final RoleRepository roleRepository;
    private final OrganizationRepository organizationRepository;
    private final BranchRepository branchRepository;
    private final AppUserRepository appUserRepository;
    private final MedicineCategoryRepository medicineCategoryRepository;
    private final MedicineUnitRepository medicineUnitRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final LabTestCategoryRepository labTestCategoryRepository;
    private final TaxRuleRepository taxRuleRepository;
    private final OrganizationSettingsRepository organizationSettingsRepository;
    private final WebsiteConfigRepository websiteConfigRepository;
    private final WebsiteServiceItemRepository websiteServiceItemRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String DEMO_PASSWORD = "demo1234";

    @Override
    @Transactional
    public void run(String... args) {
        seedOrgTypes();
        seedPlans();
        seedRoles();
        seedPharmacyMasterData();
        seedLabMasterData();
        seedTaxRules();
        seedDemoOrganizationAndUsers();
        seedDemoWebsite();
        log.info("MediUnivers seed data ready. Demo accounts all use password '{}':", DEMO_PASSWORD);
        log.info("  Platform : superadmin@mediunivers.io  (SUPER_ADMIN)");
        log.info("  Tenant   : owner@sunrise.mediunivers.io (ORG_OWNER, Sunrise Multispeciality)");
        log.info("  Patient  : patient@sunrise.mediunivers.io (PATIENT)");
    }

    private void seedOrgTypes() {
        if (orgTypeRepository.count() > 0) return;
        seedOrgType("CLINIC_ONLY", "Clinic",
                "A single or multi-branch clinic. No in-house pharmacy or laboratory.",
                ModuleGroup.ORG, ModuleGroup.CLINIC, ModuleGroup.CRM, ModuleGroup.CMS, ModuleGroup.PATIENT);
        seedOrgType("CLINIC_PHARMACY", "Clinic + Pharmacy",
                "Clinic with an attached, clinic-owned pharmacy. No laboratory.",
                ModuleGroup.ORG, ModuleGroup.CLINIC, ModuleGroup.PHARMACY, ModuleGroup.CRM, ModuleGroup.CMS, ModuleGroup.PATIENT);
        seedOrgType("MULTI_SPECIALITY", "Multi-Speciality (Clinic + Pharmacy + Lab)",
                "Full-service organization running clinic, pharmacy and laboratory together.",
                ModuleGroup.ORG, ModuleGroup.CLINIC, ModuleGroup.PHARMACY, ModuleGroup.LAB, ModuleGroup.CRM, ModuleGroup.CMS, ModuleGroup.PATIENT);
        seedOrgType("STANDALONE_PHARMACY", "Standalone Pharmacy",
                "Pharmacy-only business with no clinic or laboratory operations.",
                ModuleGroup.ORG, ModuleGroup.PHARMACY, ModuleGroup.CRM, ModuleGroup.CMS, ModuleGroup.PATIENT);
        seedOrgType("STANDALONE_LAB", "Standalone Laboratory",
                "Diagnostic laboratory only — no clinic or pharmacy operations.",
                ModuleGroup.ORG, ModuleGroup.LAB, ModuleGroup.CRM, ModuleGroup.CMS, ModuleGroup.PATIENT);
    }

    private void seedOrgType(String code, String name, String description, ModuleGroup... modules) {
        OrgType t = new OrgType();
        t.setCode(code);
        t.setName(name);
        t.setDescription(description);
        t.getModules().addAll(List.of(modules));
        orgTypeRepository.save(t);
    }

    private void seedPlans() {
        if (planRepository.count() > 0) return;
        seedPlan("TRIAL", "Free Trial", "\u20b90 / 14 days",
                "Demo requested and approved by the MediUnivers sales team.",
                1, 5, "1 GB", 0, List.of("Clinic module", "1 branch", "5 users"),
                ModuleGroup.ORG, ModuleGroup.PATIENT, ModuleGroup.CLINIC);
        seedPlan("STARTER", "Starter", "\u20b92,999 / month",
                "Single clinic running appointments, queue and billing.",
                2, 15, "10 GB", 1, List.of("Clinic module", "2 branches", "15 users"),
                ModuleGroup.ORG, ModuleGroup.PATIENT, ModuleGroup.CLINIC);
        seedPlan("PROFESSIONAL", "Professional", "\u20b97,999 / month",
                "Multi-branch clinic with pharmacy, laboratory, patient CRM and a public website.",
                10, 75, "100 GB", 2, List.of("Clinic + Pharmacy + Lab", "Patient CRM", "Website Builder", "10 branches"),
                ModuleGroup.ORG, ModuleGroup.PATIENT, ModuleGroup.CLINIC, ModuleGroup.PHARMACY, ModuleGroup.LAB, ModuleGroup.CRM, ModuleGroup.CMS);
        seedPlan("ENTERPRISE", "Enterprise", "Custom",
                "Everything, including the website builder and custom roles.",
                999, 999, "1 TB", 3, List.of("All modules", "Website builder", "Unlimited branches"),
                ModuleGroup.ORG, ModuleGroup.PATIENT, ModuleGroup.CLINIC, ModuleGroup.PHARMACY, ModuleGroup.LAB, ModuleGroup.CRM, ModuleGroup.CMS);
    }

    private void seedPlan(String code, String name, String priceLabel, String tagline, int maxBranches,
                           int maxUsers, String storageLabel, int sortOrder, List<String> highlights, ModuleGroup... modules) {
        Plan p = new Plan();
        p.setCode(code);
        p.setName(name);
        p.setPriceLabel(priceLabel);
        p.setTagline(tagline);
        p.setMaxBranches(maxBranches);
        p.setMaxUsers(maxUsers);
        p.setStorageLabel(storageLabel);
        p.setSortOrder(sortOrder);
        p.getModules().addAll(List.of(modules));
        p.getHighlights().addAll(highlights);
        planRepository.save(p);
    }

    private void seedRoles() {
        if (roleRepository.count() > 0) return;

        // --- Platform roles (MediUnivers' own staff) ---
        role("SUPER_ADMIN", "Super Admin", Portal.PLATFORM,
                "Full control of the MediUnivers product, tenants, plans and billing.",
                access(g(ModuleGroup.PLATFORM), g(ModuleGroup.CMS)),
                ActionType.VIEW, ActionType.CREATE, ActionType.UPDATE, ActionType.DELETE, ActionType.EXPORT, ActionType.APPROVE);

        role("PLATFORM_SALES_LEAD", "Sales / CRM Team Lead", Portal.PLATFORM,
                "Owns the demo \u2192 trial \u2192 subscription pipeline and the sales team.",
                access(p(ModuleGroup.PLATFORM, "platform/organizations", "platform/demo-requests", "platform/leads",
                        "platform/trials", "platform/subscriptions", "platform/plans", "platform/coupons", "platform/referrals")),
                ActionType.VIEW, ActionType.CREATE, ActionType.UPDATE, ActionType.EXPORT, ActionType.APPROVE);

        role("PLATFORM_SALES_AGENT", "Sales Executive", Portal.PLATFORM,
                "Works assigned demo requests and leads, schedules product demos.",
                access(p(ModuleGroup.PLATFORM, "platform/demo-requests", "platform/leads", "platform/trials", "platform/organizations")),
                ActionType.VIEW, ActionType.CREATE, ActionType.UPDATE);

        role("PLATFORM_SUPPORT", "Support Agent", Portal.PLATFORM,
                "Handles tenant support tickets and onboarding assistance.",
                access(p(ModuleGroup.PLATFORM, "platform/support", "platform/organizations", "platform/audit-logs")),
                ActionType.VIEW, ActionType.UPDATE);

        role("PLATFORM_FINANCE", "Finance / Billing", Portal.PLATFORM,
                "Subscriptions, invoices, coupons and revenue reporting.",
                access(p(ModuleGroup.PLATFORM, "platform/subscriptions", "platform/plans", "platform/coupons", "platform/organizations")),
                ActionType.VIEW, ActionType.UPDATE, ActionType.EXPORT);

        role("PLATFORM_MARKETING", "Marketing / Website", Portal.PLATFORM,
                "MediUnivers marketing website content and SEO.",
                access(p(ModuleGroup.PLATFORM, "platform/cms"), g(ModuleGroup.CMS)),
                ActionType.VIEW, ActionType.CREATE, ActionType.UPDATE, ActionType.DELETE);

        // --- Tenant roles (a subscribed organization's own staff) ---
        role("ORG_OWNER", "Organization Owner", Portal.TENANT,
                "Buys the subscription, owns the organization, creates all other roles.",
                access(g(ModuleGroup.ORG), g(ModuleGroup.BILLING), g(ModuleGroup.CLINIC), g(ModuleGroup.PHARMACY), g(ModuleGroup.LAB), g(ModuleGroup.CRM), g(ModuleGroup.CMS)),
                ActionType.VIEW, ActionType.CREATE, ActionType.UPDATE, ActionType.DELETE, ActionType.EXPORT, ActionType.APPROVE);

        role("ORG_ADMIN", "Organization Admin", Portal.TENANT,
                "Runs day to day configuration, users, branches and roles.",
                access(g(ModuleGroup.ORG), g(ModuleGroup.BILLING), g(ModuleGroup.CLINIC), g(ModuleGroup.PHARMACY), g(ModuleGroup.LAB), g(ModuleGroup.CRM), g(ModuleGroup.CMS)),
                ActionType.VIEW, ActionType.CREATE, ActionType.UPDATE, ActionType.EXPORT);

        role("CLINIC_ADMIN", "Clinic Admin", Portal.TENANT,
                "Manages one clinic/branch: staff, schedules, billing.",
                access(p(ModuleGroup.ORG, "org/branches", "org/departments", "org/users"), g(ModuleGroup.CLINIC), g(ModuleGroup.BILLING)),
                ActionType.VIEW, ActionType.CREATE, ActionType.UPDATE, ActionType.DELETE, ActionType.EXPORT);

        role("DOCTOR", "Doctor", Portal.TENANT,
                "Consultations, prescriptions, lab review and own availability.",
                access(p(ModuleGroup.CLINIC, "clinic/patients", "clinic/appointments", "clinic/queue",
                        "clinic/consultations", "clinic/prescriptions", "clinic/availability"),
                        p(ModuleGroup.LAB, "lab/orders", "lab/results", "lab/review")),
                ActionType.VIEW, ActionType.CREATE, ActionType.UPDATE, ActionType.APPROVE);

        role("RECEPTIONIST", "Receptionist", Portal.TENANT,
                "Front desk: registration, appointments, queue and payments.",
                access(p(ModuleGroup.CLINIC, "clinic/patients", "clinic/appointments", "clinic/walk-in",
                        "clinic/reception", "clinic/queue", "clinic/billing"),
                        p(ModuleGroup.BILLING, "billing/invoices")),
                ActionType.VIEW, ActionType.CREATE, ActionType.UPDATE);

        role("NURSE", "Nurse", Portal.TENANT,
                "Vitals, queue support and consultation assistance.",
                access(p(ModuleGroup.CLINIC, "clinic/patients", "clinic/queue", "clinic/consultations", "clinic/appointments")),
                ActionType.VIEW, ActionType.UPDATE);

        role("PHARMACIST", "Pharmacist", Portal.TENANT,
                "Dispensing, sales, stock and purchase management.",
                access(g(ModuleGroup.PHARMACY), p(ModuleGroup.BILLING, "billing/invoices")),
                ActionType.VIEW, ActionType.CREATE, ActionType.UPDATE, ActionType.EXPORT);

        role("LAB_MANAGER", "Lab Manager", Portal.TENANT,
                "Full laboratory operations, catalogue and reporting.",
                access(g(ModuleGroup.LAB), p(ModuleGroup.BILLING, "billing/invoices")),
                ActionType.VIEW, ActionType.CREATE, ActionType.UPDATE, ActionType.DELETE, ActionType.EXPORT, ActionType.APPROVE);

        role("LAB_TECHNICIAN", "Lab Technician", Portal.TENANT,
                "Sample collection, processing and result entry.",
                access(p(ModuleGroup.LAB, "lab/orders", "lab/samples", "lab/processing", "lab/results")),
                ActionType.VIEW, ActionType.UPDATE);

        role("ACCOUNTANT", "Accountant", Portal.TENANT,
                "Billing, pharmacy sales and financial reports.",
                access(g(ModuleGroup.BILLING),
                        p(ModuleGroup.CLINIC, "clinic/billing", "clinic/reports"),
                        p(ModuleGroup.PHARMACY, "pharmacy/sales", "pharmacy/reports"),
                        p(ModuleGroup.ORG, "org/subscription")),
                ActionType.VIEW, ActionType.EXPORT);

        role("CRM_AGENT", "CRM Agent", Portal.TENANT,
                "Patient acquisition leads, follow-ups and campaigns.",
                access(g(ModuleGroup.CRM)),
                ActionType.VIEW, ActionType.CREATE, ActionType.UPDATE);

        role("MARKETING_MANAGER", "Website Manager", Portal.TENANT,
                "The organization's public website, booking page and SEO.",
                access(g(ModuleGroup.CMS), p(ModuleGroup.CRM, "crm/leads")),
                ActionType.VIEW, ActionType.CREATE, ActionType.UPDATE, ActionType.DELETE);

        // --- Patient portal ---
        role("PATIENT", "Patient", Portal.PATIENT,
                "Books appointments and views prescriptions, reports and invoices.",
                access(g(ModuleGroup.PATIENT)),
                ActionType.VIEW);
    }

    private void seedPharmacyMasterData() {
        if (medicineCategoryRepository.count() == 0) {
            for (String[] c : new String[][]{{"TABLET", "Tablet"}, {"CAPSULE", "Capsule"}, {"SYRUP", "Syrup"},
                    {"INJECTION", "Injection"}, {"DROPS", "Drops"}, {"OINTMENT", "Ointment"}, {"INHALER", "Inhaler"}, {"POWDER", "Powder"}}) {
                MedicineCategory cat = new MedicineCategory();
                cat.setCode(c[0]);
                cat.setName(c[1]);
                medicineCategoryRepository.save(cat);
            }
        }
        if (medicineUnitRepository.count() == 0) {
            for (String[] u : new String[][]{{"TABLET", "Tablet"}, {"CAPSULE", "Capsule"}, {"BOTTLE", "Bottle"},
                    {"TUBE", "Tube"}, {"VIAL", "Vial"}, {"AMPOULE", "Ampoule"}, {"STRIP", "Strip"}, {"PACK", "Pack"}}) {
                MedicineUnit unit = new MedicineUnit();
                unit.setCode(u[0]);
                unit.setName(u[1]);
                medicineUnitRepository.save(unit);
            }
        }
        if (manufacturerRepository.count() == 0) {
            for (String[] m : new String[][]{{"SUN_PHARMA", "Sun Pharma"}, {"CIPLA", "Cipla"}, {"DR_REDDYS", "Dr. Reddy's"},
                    {"MANKIND", "Mankind"}, {"LUPIN", "Lupin"}, {"ABBOTT", "Abbott"}}) {
                Manufacturer man = new Manufacturer();
                man.setCode(m[0]);
                man.setName(m[1]);
                manufacturerRepository.save(man);
            }
        }
    }

    private void seedLabMasterData() {
        if (labTestCategoryRepository.count() == 0) {
            for (String[] c : new String[][]{{"HEMATOLOGY", "Hematology"}, {"BIOCHEMISTRY", "Biochemistry"},
                    {"MICROBIOLOGY", "Microbiology"}, {"IMMUNOLOGY", "Immunology"}, {"PATHOLOGY", "Pathology"},
                    {"CLINICAL_PATHOLOGY", "Clinical Pathology"}}) {
                LabTestCategory cat = new LabTestCategory();
                cat.setCode(c[0]);
                cat.setName(c[1]);
                labTestCategoryRepository.save(cat);
            }
        }
    }

    private void seedTaxRules() {
        if (taxRuleRepository.count() > 0) return;
        Object[][] slabs = {
                {"GST0", "GST 0%", java.math.BigDecimal.ZERO},
                {"GST5", "GST 5%", java.math.BigDecimal.valueOf(5)},
                {"GST12", "GST 12%", java.math.BigDecimal.valueOf(12)},
                {"GST18", "GST 18%", java.math.BigDecimal.valueOf(18)},
                {"GST28", "GST 28%", java.math.BigDecimal.valueOf(28)},
        };
        for (Object[] slab : slabs) {
            TaxRule rule = new TaxRule();
            rule.setCode((String) slab[0]);
            rule.setName((String) slab[1]);
            rule.setPercentage((java.math.BigDecimal) slab[2]);
            rule.setActive(true);
            taxRuleRepository.save(rule);
        }
    }

    private void seedDemoOrganizationAndUsers() {
        if (organizationRepository.count() > 0) return;

        OrgType multiSpeciality = orgTypeRepository.findByCode("MULTI_SPECIALITY").orElseThrow();
        Plan professional = planRepository.findByCode("PROFESSIONAL").orElseThrow();

        Organization org = new Organization();
        org.setOrganizationCode("ORG-000001");
        org.setSlug("sunrise-multispeciality");
        org.setName("Sunrise Multispeciality");
        org.setSubdomain("sunrise");
        org.setOrgType(multiSpeciality);
        org.setPlan(professional);
        org.setStatus(OrgStatus.ACTIVE);
        org.setCreationSource(OrgCreationSource.SUPER_ADMIN);
        org.setEmail("owner@sunrise.mediunivers.io");
        org.setPhone("+91 98450 12345");
        org.setAddressLine1("100 Feet Road");
        org.setCity("Bengaluru");
        org.setState("Karnataka");
        org.setCountry("India");
        org.setPostalCode("560034");
        org.setRenewsOn(LocalDate.now().plusMonths(1));
        org = organizationRepository.save(org);

        OrganizationSettings settings = new OrganizationSettings();
        settings.setOrganization(org);
        organizationSettingsRepository.save(settings);

        Branch headOffice = newBranch(org, "Head Office", true);
        newBranch(org, "Andheri Branch", false);
        newBranch(org, "Bandra Branch", false);
        newBranch(org, "Pune Central", false);

        Role superAdmin = roleRepository.findByCode("SUPER_ADMIN").orElseThrow();
        Role orgOwner = roleRepository.findByCode("ORG_OWNER").orElseThrow();
        Role patientRole = roleRepository.findByCode("PATIENT").orElseThrow();

        newUser("superadmin@mediunivers.io", "Aarav Mehta", Portal.PLATFORM, superAdmin, null, null);
        newUser("owner@sunrise.mediunivers.io", "Dr. Neha Kapoor", Portal.TENANT, orgOwner, org, headOffice);
        newUser("patient@sunrise.mediunivers.io", "Riya Sharma", Portal.PATIENT, patientRole, org, headOffice);
    }

    private Branch newBranch(Organization org, String name, boolean head) {
        Branch b = new Branch();
        b.setOrganization(org);
        b.setName(name);
        b.setHeadOffice(head);
        b.setStatus(BranchStatus.ACTIVE);
        b.getEnabledModules().addAll(java.util.Set.of(ModuleGroup.CLINIC, ModuleGroup.PHARMACY, ModuleGroup.LAB, ModuleGroup.CRM, ModuleGroup.CMS));
        return branchRepository.save(b);
    }

    private void newUser(String email, String fullName, Portal portal, Role role, Organization org, Branch branch) {
        AppUser u = new AppUser();
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode(DEMO_PASSWORD));
        u.setFullName(fullName);
        u.setPortal(portal);
        u.setRole(role);
        u.setOrganization(org);
        u.setBranch(branch);
        u.setStatus(UserStatus.ACTIVE);
        appUserRepository.save(u);
    }

    /** So the Website Builder demo isn't blank the first time anyone looks at it. */
    private void seedDemoWebsite() {
        if (websiteConfigRepository.count() > 0) return;
        organizationRepository.findAll().stream().findFirst().ifPresent(org -> {
            WebsiteConfig config = new WebsiteConfig();
            config.setOrganization(org);
            config.setPublished(true);
            config.setTagline("Compassionate multi-speciality care, close to home.");
            config.setHeroHeading("Your health, our priority");
            config.setHeroSubheading("Book an appointment with our specialists in minutes.");
            config.setAboutContent("Sunrise Multispeciality has been serving Bengaluru with trusted, "
                    + "patient-first healthcare across multiple specialities and branches.");
            config.setContactEmail(org.getEmail());
            config.setContactPhone(org.getPhone());
            config.setContactAddress(org.getAddressLine1() + ", " + org.getCity());
            websiteConfigRepository.save(config);

            String[][] services = {
                    {"General Consultation", "Sparkles"},
                    {"Pharmacy", "Pill"},
                    {"Diagnostic Lab", "FlaskConical"},
                    {"Preventive Health Checkups", "HeartPulse"},
            };
            int order = 0;
            for (String[] s : services) {
                WebsiteServiceItem item = new WebsiteServiceItem();
                item.setOrganization(org);
                item.setName(s[0]);
                item.setIconName(s[1]);
                item.setSortOrder(order++);
                item.setActive(true);
                websiteServiceItemRepository.save(item);
            }
        });
    }

    // ---- small helpers to keep the role table above readable ----

    private record GroupSpec(ModuleGroup group, boolean wildcard, List<String> paths) {
    }

    private GroupSpec g(ModuleGroup group) {
        return new GroupSpec(group, true, List.of());
    }

    private GroupSpec p(ModuleGroup group, String... paths) {
        return new GroupSpec(group, false, List.of(paths));
    }

    @SafeVarargs
    private Map<ModuleGroup, GroupSpec> access(GroupSpec... specs) {
        Map<ModuleGroup, GroupSpec> map = new LinkedHashMap<>();
        for (GroupSpec s : specs) map.put(s.group(), s);
        return map;
    }

    private void role(String code, String name, Portal portal, String description,
                       Map<ModuleGroup, GroupSpec> access, ActionType... actions) {
        Role role = new Role();
        role.setCode(code);
        role.setName(name);
        role.setPortal(portal);
        role.setDescription(description);
        role.setSystem(true);
        role.setOrganization(null);
        role.getActions().addAll(List.of(actions));
        for (GroupSpec spec : access.values()) {
            RoleGroupAccess a = spec.wildcard()
                    ? RoleGroupAccess.wildcard(spec.group())
                    : RoleGroupAccess.paths(spec.group(), spec.paths().toArray(new String[0]));
            role.addGroupAccess(a);
        }
        roleRepository.save(role);
    }
}
