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
    private final SubscriptionRepository subscriptionRepository;
    private final WebsiteConfigRepository websiteConfigRepository;
    private final WebsiteServiceItemRepository websiteServiceItemRepository;
    private final PlatformWebsiteConfigRepository platformWebsiteConfigRepository;
    private final PlatformTestimonialRepository platformTestimonialRepository;
    private final PlatformBlogPostRepository platformBlogPostRepository;
    private final PlatformContentCardRepository platformContentCardRepository;
    private final com.MediUnivers.service.service.NotificationTemplateService notificationTemplateService;
    private final com.MediUnivers.service.service.NotificationService notificationService;
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
        seedPlatformWebsiteContent();
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
                1, 5, 5, "1 GB", 0, java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, true, 14,
                List.of("Clinic module", "1 branch", "5 users"),
                ModuleGroup.ORG, ModuleGroup.PATIENT, ModuleGroup.CLINIC);
        seedPlan("STARTER", "Starter", "\u20b92,999 / month",
                "Single clinic running appointments, queue and billing.",
                2, 15, 10, "10 GB", 1, java.math.BigDecimal.valueOf(2999), java.math.BigDecimal.valueOf(18), false, 0,
                List.of("Clinic module", "2 branches", "15 users"),
                ModuleGroup.ORG, ModuleGroup.PATIENT, ModuleGroup.CLINIC);
        seedPlan("PROFESSIONAL", "Professional", "\u20b97,999 / month",
                "Multi-branch clinic with pharmacy, laboratory, patient CRM and a public website.",
                10, 75, 25, "100 GB", 2, java.math.BigDecimal.valueOf(7999), java.math.BigDecimal.valueOf(18), false, 0,
                List.of("Clinic + Pharmacy + Lab", "Patient CRM", "Website Builder", "10 branches"),
                ModuleGroup.ORG, ModuleGroup.PATIENT, ModuleGroup.CLINIC, ModuleGroup.PHARMACY, ModuleGroup.LAB, ModuleGroup.CRM, ModuleGroup.CMS);
        seedPlan("ENTERPRISE", "Enterprise", "Custom",
                "Everything, including the website builder and custom roles.",
                999, 999, 999, "1 TB", 3, java.math.BigDecimal.ZERO, java.math.BigDecimal.valueOf(18), false, 0,
                List.of("All modules", "Website builder", "Unlimited branches"),
                ModuleGroup.ORG, ModuleGroup.PATIENT, ModuleGroup.CLINIC, ModuleGroup.PHARMACY, ModuleGroup.LAB, ModuleGroup.CRM, ModuleGroup.CMS);
    }

    private void seedPlan(String code, String name, String priceLabel, String tagline, int maxBranches,
                           int maxUsers, int maxDoctorsPerBranch, String storageLabel, int sortOrder,
                           java.math.BigDecimal priceWithoutTax, java.math.BigDecimal taxPercent,
                           boolean freeTrial, int freeTrialDays, List<String> highlights, ModuleGroup... modules) {
        Plan p = new Plan();
        p.setCode(code);
        p.setName(name);
        p.setPriceLabel(priceLabel);
        p.setTagline(tagline);
        p.setMaxBranches(maxBranches);
        p.setMaxUsers(maxUsers);
        p.setMaxDoctorsPerBranch(maxDoctorsPerBranch);
        p.setStorageLabel(storageLabel);
        p.setSortOrder(sortOrder);
        p.setPriceWithoutTax(priceWithoutTax);
        p.setTaxPercent(taxPercent);
        p.setFreeTrial(freeTrial);
        p.setFreeTrialDays(freeTrialDays);
        p.setActive(true);
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
        // The demo org's code is hardcoded rather than pulled from
        // organization_code_seq, so advance the sequence in lockstep here —
        // otherwise the first real org created afterwards collides on
        // "ORG-000001" (uq_organizations_code) since the sequence would still
        // think nextval() hasn't issued 1 yet.
        organizationRepository.nextOrganizationCodeNumber();
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

        Subscription demoSub = new Subscription();
        demoSub.setOrganization(org);
        demoSub.setPlan(professional);
        demoSub.setPlanCodeSnapshot(professional.getCode());
        demoSub.setPlanNameSnapshot(professional.getName());
        demoSub.setStartDate(LocalDate.now());
        demoSub.setEndDate(org.getRenewsOn());
        demoSub.setPriceWithoutTax(professional.getPriceWithoutTax());
        demoSub.setTaxPercent(professional.getTaxPercent());
        demoSub.setPriceWithTax(com.MediUnivers.service.service.PricingCalculator.withTax(professional.getPriceWithoutTax(), professional.getTaxPercent()));
        demoSub.setStatus(SubscriptionStatus.ACTIVE);
        subscriptionRepository.save(demoSub);

        OrganizationSettings settings = new OrganizationSettings();
        settings.setOrganization(org);
        organizationSettingsRepository.save(settings);

        notificationService.getOrCreateSettings(org);
        notificationTemplateService.seedDefaults(org);

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

    /**
     * MediUnivers' own public marketing site — real starter content so the site isn't
     * blank on first boot, editable from Platform > Website Content from here on. Every
     * insert is guarded by "does this section already have anything?" so it never
     * overwrites what a Super Admin has since edited.
     */
    private void seedPlatformWebsiteContent() {
        PlatformWebsiteConfig config = platformWebsiteConfigRepository.findAll().stream().findFirst()
                .orElseGet(PlatformWebsiteConfig::new);
        if (config.getTagline() == null || config.getTagline().isBlank()) {
            config.setTagline("Multi-tenant healthcare platform for clinics, pharmacies and diagnostic laboratories.");
            config.setHeroHeading("Run your clinic, pharmacy and lab on one platform");
            config.setHeroSubheading("Appointments, prescriptions, inventory, lab results and billing — all in one console, switched on by the plan you choose.");
            config.setAboutContent("MediUnivers builds and operates a multi-tenant healthcare platform. "
                    + "Organizations subscribe, choose a plan and get exactly the modules that plan unlocks.");
            config.setMissionContent("Healthcare teams lose hours every day to registers, spreadsheets and disconnected software. "
                    + "MediUnivers replaces that with one console where appointments, prescriptions, inventory, lab results, "
                    + "billing and the organization's public website all share the same data.\n\n"
                    + "Organizations request a demo, choose a plan and get exactly the modules that plan unlocks. From there "
                    + "the organization's own administrator creates roles for doctors, reception, pharmacists, lab technicians "
                    + "and accountants — so every staff member logs in to a workspace built around their job.");
            config.setContactEmail("hello@mediunivers.io");
            config.setContactPhone("+91 80 4567 8900");
            config.setContactAddress("4th Floor, Prestige Tech Park, Bengaluru 560103");
            config.setStatsJson("[{\"label\":\"Organizations\",\"value\":\"480+\"},"
                    + "{\"label\":\"Branches live\",\"value\":\"1,200+\"},"
                    + "{\"label\":\"Appointments booked\",\"value\":\"2.1M+\"},"
                    + "{\"label\":\"Uptime\",\"value\":\"99.9%\"}]");
            config.setSeoTitle("MediUnivers — Healthcare SaaS Platform");
            config.setSeoDescription("Multi-tenant healthcare platform for clinics, pharmacies and diagnostic laboratories.");
            config.setPrivacyContent("MediUnivers collects only the information needed to operate your organization's "
                    + "workspace: account details, the clinical, pharmacy and laboratory records your staff enter, and "
                    + "basic usage data to keep the platform reliable. Data is scoped by organization — one subscriber "
                    + "can never see another's records. We never sell customer data to third parties.");
            config.setTermsContent("By creating an account you agree to use MediUnivers only for lawful healthcare "
                    + "operations for the organization you represent. Subscriptions renew on the cycle you choose and "
                    + "can be cancelled at any time from Billing. Each plan defines the modules, branches and users "
                    + "included; usage beyond that requires an upgrade.");
            config.setSecurityContent("All traffic is encrypted in transit (TLS) and data is encrypted at rest. Access "
                    + "is role-based down to the page and action level, and every organization's data is isolated from "
                    + "every other's at the database layer. Platform staff access is logged and limited to what support "
                    + "and operations genuinely require.");
            platformWebsiteConfigRepository.save(config);
        }

        if (platformTestimonialRepository.count() == 0) {
            seedTestimonial("Dr. Kavya Nair", "Founder, Nair Family Clinic — Kochi",
                    "Reception, queue and billing finally live in one place. Our average patient wait dropped by 18 minutes.", 5, 0);
            seedTestimonial("Rahul Shetty", "Operations Head, LifeCare Pharmacy — Bengaluru",
                    "Batch and expiry alerts alone paid for the subscription in the first quarter.", 5, 1);
            seedTestimonial("Dr. Imran Qureshi", "Lab Director, PrecisePath Diagnostics — Hyderabad",
                    "Sample tracking with a doctor review step removed the phone calls chasing pending results.", 5, 2);
            seedTestimonial("Sneha Patil", "Org Admin, Aarogya Group — Pune",
                    "I created our own Front Desk and Senior Nurse roles in minutes — everyone sees exactly their pages.", 5, 3);
            seedTestimonial("Dr. Vikram Rao", "Consultant Cardiologist — Chennai",
                    "Consultation notes and prescriptions are quick enough that I actually use them during the visit.", 4, 4);
            seedTestimonial("Meera Joshi", "Marketing Lead, SmileWorks Dental — Ahmedabad",
                    "The built-in website and online booking replaced three separate tools we were paying for.", 5, 5);
        }

        if (platformBlogPostRepository.count() == 0) {
            seedBlogPost("Cutting patient wait time with a live queue", "Dr. Kavya Nair",
                    "How token-based queues and reception dashboards reduce the crowd at your front desk.",
                    "Most clinics still call patients by shouting a name across a waiting room. A live, token-based queue "
                            + "changes that: patients check in once, see their position on a screen, and reception can "
                            + "reprioritize walk-ins without losing the line.\n\n"
                            + "The bigger win is downstream — once reception, the doctor's consultation queue and billing "
                            + "all read from the same live queue, nobody re-enters a patient's details three times, and "
                            + "the front desk always knows exactly how many people are actually waiting.");
            seedBlogPost("Batch and expiry: the pharmacy discipline that saves money", "Rahul Shetty",
                    "A simple stock policy that prevents write-offs and keeps fast movers on the shelf.",
                    "Every pharmacy writes off stock eventually — the question is how much. Batches with an expiry date "
                            + "attached, and an alert before that date arrives, turns a periodic surprise into a routine "
                            + "task: rotate old stock forward, order less of what's overstocked, and dispense against "
                            + "the earliest expiry first automatically.\n\n"
                            + "Pharmacies that adopt this consistently report the alerts paying for the software within "
                            + "a quarter, purely from reduced write-offs.");
            seedBlogPost("Lab turnaround time, measured properly", "Dr. Imran Qureshi",
                    "Where samples actually get stuck, and the four checkpoints worth tracking.",
                    "\"Turnaround time\" usually gets measured start-to-finish, which hides where a sample actually "
                            + "loses time. Splitting it into four checkpoints — collection, receipt at the lab, "
                            + "processing complete, and doctor review — makes the slow stage obvious.\n\n"
                            + "In most labs, the surprise stage isn't processing at all — it's waiting for a referring "
                            + "doctor to review and sign off before the report can be released.");
            seedBlogPost("Converting enquiries into first appointments", "Sneha Patil",
                    "Follow-up cadence, lead sources and the metrics that predict conversion.",
                    "An enquiry that isn't followed up within a day rarely converts. Tracking where a lead came from "
                            + "and assigning it to a specific person immediately — rather than a shared inbox — is the "
                            + "single biggest lever most organizations haven't pulled yet.\n\n"
                            + "The metric worth watching isn't total enquiries; it's time-to-first-response.");
            seedBlogPost("Designing roles for a multi-branch group", "Dr. Vikram Rao",
                    "Give each team the pages they need — nothing more — without slowing anyone down.",
                    "Multi-branch organizations tend to over-grant access out of convenience, then regret it. Building "
                            + "roles around what a job actually needs — reception sees the queue and billing, doctors "
                            + "see consultations and prescriptions — keeps every screen relevant to the person using it.\n\n"
                            + "Custom roles, created by the organization's own admin, let this shift as the team grows "
                            + "without waiting on anyone else.");
            seedBlogPost("Your clinic website should book appointments", "Meera Joshi",
                    "Turning a brochure site into the cheapest patient acquisition channel you have.",
                    "A website that only lists an address and phone number is a missed appointment every time a visitor "
                            + "closes the tab. Connecting the public site directly to real doctor availability turns "
                            + "casual browsing into a booked slot without a phone call.\n\n"
                            + "It's also the cheapest acquisition channel available — the visitor already found you.");
        }

        if (platformContentCardRepository.count() == 0) {
            seedFeature("CalendarDays", "Clinic management",
                    "Patient registration & records\nAppointments and walk-ins\nReception & live queue\n"
                            + "Consultation and prescriptions\nDoctor availability\nBilling and invoices", 0);
            seedFeature("Pill", "Pharmacy",
                    "Medicine categories & master\nManufacturers and suppliers\nPurchases and batch/expiry\n"
                            + "Stock levels & low-stock alerts\nPrescription dispensing\nDirect sales and returns", 1);
            seedFeature("FlaskConical", "Laboratory",
                    "Test categories & catalogue\nTest packages\nOrders and sample tracking\n"
                            + "Processing status\nResult entry\nDoctor review and reports", 2);
            seedFeature("Target", "Patient CRM",
                    "Lead sources\nLead pipeline and status\nAssignment to agents\n"
                            + "Follow-ups and activities\nConversion reports", 3);
            seedFeature("Globe", "Website & CMS",
                    "Templates and branding\nPages, services, gallery\nTestimonials and blogs\n"
                            + "Online booking\nSEO settings and subdomain", 4);
            seedFeature("ShieldCheck", "Access control",
                    "Platform, organization and patient portals\n14 built-in roles\n"
                            + "Custom roles created by the org admin\nPage and action level permissions\n"
                            + "Plan-based module entitlement", 5);
            seedFeature("Building2", "Organization setup",
                    "Clinics and branches\nDepartments\nUsers and invitations\n"
                            + "Subscription and billing\nGuided onboarding wizard", 6);
            seedFeature("Users", "Patient portal",
                    "Profile and history\nAppointments\nPrescriptions\nLab reports\nInvoices", 7);

            seedSolution("Single clinic", "Starter",
                    "One doctor or a small team running appointments, walk-ins, prescriptions and billing without paperwork.",
                    "Live queue at reception\nDigital prescriptions\nDaily collection report", 0);
            seedSolution("Multi-branch group", "Professional",
                    "Several clinics under one organization with departments, shared patient records and per-branch reporting.",
                    "Branch switcher\nDepartment-wise load\nConsolidated revenue", 1);
            seedSolution("Pharmacy chain", "Professional",
                    "Purchase to sale traceability with batch and expiry control across every counter.",
                    "Batch & expiry alerts\nSupplier ledger\nPrescription dispensing", 2);
            seedSolution("Diagnostic laboratory", "Professional",
                    "Order intake, sample tracking and verified result delivery back to the referring doctor.",
                    "Sample barcode flow\nDoctor review step\nDownloadable reports", 3);
            seedSolution("Polyclinic / hospital", "Enterprise",
                    "Clinic, pharmacy and lab operating together, plus a public website and custom staff roles.",
                    "All modules\nWebsite builder\nCustom role designer", 4);
            seedSolution("Patients", "Included",
                    "A patient portal for appointments, prescriptions, lab reports and invoices.",
                    "Online booking\nReport history\nInvoice downloads", 5);

            seedValue("HeartPulse", "Care comes first",
                    "Every screen is designed to shorten the distance between a patient and their treatment.", 0);
            seedValue("ShieldCheck", "Access by design",
                    "Data is scoped by portal, plan and role — nobody sees more than their job requires.", 1);
            seedValue("Building2", "One product, many tenants",
                    "We build and run the product; organizations subscribe and configure it for themselves.", 2);
            seedValue("Users", "Support that knows healthcare",
                    "Sales, onboarding and support teams that have worked inside clinics and labs.", 3);

            seedTeam("Product & Engineering", "Owns the platform roadmap, module releases and reliability.", 0);
            seedTeam("Sales & CRM", "Handles demo requests, qualifies leads and moves organizations onto the right plan.", 1);
            seedTeam("Onboarding", "Sets up organizations, clinics, branches and the first set of staff roles.", 2);
            seedTeam("Support & Finance", "Resolves tickets, manages subscriptions, invoices, coupons and referrals.", 3);
        }
    }

    private void seedTestimonial(String name, String roleCompany, String message, int rating, int sortOrder) {
        PlatformTestimonial t = new PlatformTestimonial();
        t.setName(name);
        t.setRoleCompany(roleCompany);
        t.setMessage(message);
        t.setRating(rating);
        t.setSortOrder(sortOrder);
        t.setPublished(true);
        platformTestimonialRepository.save(t);
    }

    private void seedBlogPost(String title, String author, String excerpt, String content) {
        PlatformBlogPost post = new PlatformBlogPost();
        post.setTitle(title);
        String slug = title.toLowerCase(java.util.Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        post.setSlug(slug);
        post.setAuthor(author);
        post.setExcerpt(excerpt);
        post.setContent(content);
        post.setPublished(true);
        post.setPublishedAt(java.time.Instant.now());
        platformBlogPostRepository.save(post);
    }

    private void seedFeature(String icon, String title, String bulletsText, int sortOrder) {
        seedContentCard(PlatformContentSection.FEATURE, icon, title, null, null, bulletsText, sortOrder);
    }

    private void seedSolution(String title, String tag, String description, String bulletsText, int sortOrder) {
        seedContentCard(PlatformContentSection.SOLUTION, null, title, tag, description, bulletsText, sortOrder);
    }

    private void seedValue(String icon, String title, String description, int sortOrder) {
        seedContentCard(PlatformContentSection.VALUE, icon, title, null, description, null, sortOrder);
    }

    private void seedTeam(String title, String description, int sortOrder) {
        seedContentCard(PlatformContentSection.TEAM, null, title, null, description, null, sortOrder);
    }

    private void seedContentCard(PlatformContentSection section, String icon, String title, String tag,
                                  String description, String bulletsText, int sortOrder) {
        PlatformContentCard card = new PlatformContentCard();
        card.setSection(section);
        card.setIcon(icon);
        card.setTitle(title);
        card.setTag(tag);
        card.setDescription(description);
        card.setBulletsText(bulletsText);
        card.setSortOrder(sortOrder);
        card.setPublished(true);
        platformContentCardRepository.save(card);
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
