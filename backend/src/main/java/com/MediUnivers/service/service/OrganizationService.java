package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.payment.GatewayOrderResult;
import com.MediUnivers.service.payment.PaymentGatewayService;
import com.MediUnivers.service.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Creating an organization is the one moment several dynamic pieces come
 * together (Organization Foundation spec §7 — "Organization Provisioning
 * Service", one flow regardless of where the signup came from): pick an
 * Organization Type, pick a Plan, and get back a ready-to-use tenant — a
 * unique code, a head branch, org settings, and an Org Owner invited (not
 * handed a password directly) to set up their own login. Three entry points
 * share this core: platform staff creating an org directly (paid up front,
 * no gate), a public free-trial signup (no payment at all), and a public
 * paid subscribe signup (org starts DRAFT — nobody can log in per
 * AppUserPrincipal.isEnabled() — until payment is confirmed).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class OrganizationService {

    private static final List<ModuleGroup> BUSINESS_MODULES =
            List.of(ModuleGroup.CLINIC, ModuleGroup.PHARMACY, ModuleGroup.LAB, ModuleGroup.CRM, ModuleGroup.CMS);

    private final OrganizationRepository organizationRepository;
    private final OrganizationSettingsRepository organizationSettingsRepository;
    private final BranchRepository branchRepository;
    private final OrgTypeRepository orgTypeRepository;
    private final PlanRepository planRepository;
    private final RoleRepository roleRepository;
    private final AppUserRepository appUserRepository;
    private final UserInvitationService userInvitationService;
    private final NotificationTemplateService notificationTemplateService;
    private final NotificationService notificationService;
    private final SubscriptionRepository subscriptionRepository;
    private final PaymentGatewayService paymentGatewayService;
    private final ModulePriceRepository modulePriceRepository;

    private static final java.math.BigDecimal CUSTOM_PLAN_TAX_PERCENT = java.math.BigDecimal.valueOf(18);

    // ---------------- Platform: list / create / plan changes ----------------

    @Transactional(readOnly = true)
    public List<OrganizationDto> listAll() {
        return organizationRepository.findAll().stream()
                .map(o -> DtoMapper.toDto(o, branchRepository.findByOrganizationId(o.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public OrganizationDto getById(Long id) {
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Organization not found: " + id));
        return DtoMapper.toDto(org, branchRepository.findByOrganizationId(id));
    }

    public OrganizationDto create(CreateOrganizationRequest request) {
        requireEmailAvailable(request.ownerEmail());

        OrgType orgType = requireOrgType(request.orgTypeCode());
        Plan plan = requirePlan(request.planCode());

        OrgCreationSource source = OrgCreationSource.DIRECT_SALES;
        if (request.creationSource() != null && !request.creationSource().isBlank()) {
            try {
                source = OrgCreationSource.valueOf(request.creationSource().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown creation source: " + request.creationSource());
            }
        }

        Organization org = new Organization();
        org.setOrganizationCode(generateOrganizationCode());
        org.setSlug(generateUniqueSlug(request.organizationName()));
        org.setName(request.organizationName());
        org.setSubdomain(request.subdomain());
        org.setOrgType(orgType);
        org.setCreationSource(source);
        org.setEmail(request.ownerEmail());

        // A platform staff member is provisioning this org directly — they've
        // already closed the deal (or approved the trial), so there's no
        // separate payment gate here: free-trial plans start TRIAL, everything
        // else starts ACTIVE immediately (previously this was hardcoded to
        // TRIAL regardless of plan, which was wrong for paid direct sales).
        Subscription sub = newSubscriptionFor(plan);
        org.setStatus(plan.isFreeTrial() ? OrgStatus.TRIAL : OrgStatus.ACTIVE);
        org.setPlan(plan);
        org.setRenewsOn(sub.getEndDate());
        org = organizationRepository.save(org);

        sub.setOrganization(org);
        subscriptionRepository.save(sub);

        Branch head = provisionSettingsAndHeadBranch(org, request.headBranchName());
        inviteOwner(org, head, request.ownerFullName(), request.ownerEmail());

        return DtoMapper.toDto(org, List.of(head));
    }

    public OrganizationDto changePlan(Long organizationId, String planCode) {
        Organization org = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new EntityNotFoundException("Organization not found: " + organizationId));
        Plan plan = requirePlan(planCode);

        // Keep Subscription (the source of truth for pricing/date history) in
        // sync whenever a platform admin swaps an org's plan directly, so it
        // never drifts from Organization.plan and never blocks a later
        // deactivation of the plan the org has actually moved off.
        subscriptionRepository.findFirstByOrganizationIdAndStatusOrderByStartDateDesc(organizationId, SubscriptionStatus.ACTIVE)
                .ifPresent(previous -> {
                    previous.setStatus(SubscriptionStatus.SUPERSEDED);
                    subscriptionRepository.save(previous);
                });

        Subscription sub = newSubscriptionFor(plan);
        sub.setOrganization(org);
        subscriptionRepository.save(sub);

        org.setPlan(plan);
        org.setRenewsOn(sub.getEndDate());
        organizationRepository.save(org);
        return DtoMapper.toDto(org, branchRepository.findByOrganizationId(organizationId));
    }

    // ---------------- Public self-serve signup (req #3, #5, #6) ----------------

    /** No payment gate at all — the org is TRIAL and the owner can accept their invite the moment it arrives. */
    public OrganizationDto createFreeTrial(PublicOrganizationSignupRequest request) {
        requireEmailAvailable(request.ownerEmail());
        requireSubdomainAvailable(request.subdomain());

        OrgType orgType = requireOrgType(request.orgTypeCode());
        Plan trialPlan = planRepository.findFirstByFreeTrialTrueAndActiveTrueOrderBySortOrderAsc()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "No free-trial plan is configured right now."));

        Organization org = buildOrganizationShell(request, orgType, OrgCreationSource.FREE_TRIAL);

        Subscription sub = newSubscriptionFor(trialPlan);
        org.setStatus(OrgStatus.TRIAL);
        org.setPlan(trialPlan);
        org.setRenewsOn(sub.getEndDate());
        org = organizationRepository.save(org);

        sub.setOrganization(org);
        subscriptionRepository.save(sub);

        Branch head = provisionSettingsAndHeadBranch(org, request.headBranchName());
        inviteOwner(org, head, request.ownerFullName(), request.ownerEmail());

        return DtoMapper.toDto(org, List.of(head));
    }

    /**
     * Step 1 of the paid self-serve flow (req #3): create the organization
     * account only — no plan chosen yet. The org gets the reserved
     * UNSUBSCRIBED placeholder plan (zero modules — grants no real product
     * access) and stays DRAFT, which {@link AppUserPrincipal#isEnabled()}
     * only lets the Owner past. The owner is invited immediately, same as
     * every other creation path; they can complete plan selection either
     * right here on the public site (step 2 below) or later by logging in,
     * where they land straight on the plans screen. Returns the signup
     * token step 2 needs.
     */
    public PublicSignupResultDto createAccount(PublicOrganizationSignupRequest request) {
        requireEmailAvailable(request.ownerEmail());
        requireSubdomainAvailable(request.subdomain());

        OrgType orgType = requireOrgType(request.orgTypeCode());
        Plan placeholder = requirePlan("UNSUBSCRIBED");

        Organization org = buildOrganizationShell(request, orgType, OrgCreationSource.ONLINE_PURCHASE);
        org.setStatus(OrgStatus.DRAFT);
        org.setPlan(placeholder);
        org.setSignupToken(UUID.randomUUID().toString().replace("-", ""));
        org = organizationRepository.save(org);

        Branch head = provisionSettingsAndHeadBranch(org, request.headBranchName());
        inviteOwner(org, head, request.ownerFullName(), request.ownerEmail());

        return new PublicSignupResultDto(org.getId(), org.getOrganizationCode(), org.getSignupToken(), org.getStatus().name());
    }

    /** Step 2a (public, no login): pick a real plan and ask the gateway for an order. */
    public GatewayOrderDto selectPlanAndCreateGatewayOrder(Long organizationId, String signupToken, String planCode) {
        Organization org = requireDraftOrgByToken(organizationId, signupToken);
        Plan plan = requirePlan(planCode);
        if (plan.isFreeTrial()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This plan is a free trial — use the free trial signup instead.");
        }

        cancelPendingSubscriptions(organizationId);
        Subscription sub = buildPendingSubscription(org, plan);
        subscriptionRepository.save(sub);
        return requestGatewayOrder(org, sub);
    }

    /**
     * Step 2a alternative (public, no login): none of the fixed plans fit, so
     * the customer builds their own by picking modules — price is the sum of
     * each selected module's admin-configured per-month rate. Reuses the
     * exact same PENDING_PAYMENT -> gateway-order -> confirm pipeline as a
     * fixed-plan purchase; the only difference is where the Plan row comes
     * from (created/updated on the fly here instead of picked from the
     * catalog).
     */
    public GatewayOrderDto selectCustomPlanAndCreateGatewayOrder(Long organizationId, String signupToken, SelectCustomPlanRequest request) {
        Organization org = requireDraftOrgByToken(organizationId, signupToken);

        Set<ModuleGroup> selected = request.modules().stream()
                .map(raw -> {
                    try {
                        return ModuleGroup.valueOf(raw.toUpperCase(Locale.ROOT));
                    } catch (IllegalArgumentException ex) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown module: " + raw);
                    }
                })
                .peek(g -> {
                    if (!BUSINESS_MODULES.contains(g)) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, g + " can't be part of a custom plan.");
                    }
                })
                .collect(Collectors.toSet());

        java.math.BigDecimal priceWithoutTax = selected.stream()
                .map(g -> modulePriceRepository.findByModuleGroup(g)
                        .filter(ModulePrice::isActive)
                        .map(ModulePrice::getPricePerMonth)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, g + " isn't available for a custom plan right now.")))
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        Plan plan = requireOrCreateCustomPlan(org, selected, request.maxBranches(), request.maxUsers(),
                request.maxDoctorsPerBranch(), priceWithoutTax);

        cancelPendingSubscriptions(organizationId);
        Subscription sub = buildPendingSubscription(org, plan);
        subscriptionRepository.save(sub);
        return requestGatewayOrder(org, sub);
    }

    private Subscription buildPendingSubscription(Organization org, Plan plan) {
        Subscription sub = new Subscription();
        sub.setOrganization(org);
        sub.setPlan(plan);
        sub.setPlanCodeSnapshot(plan.getCode());
        sub.setPlanNameSnapshot(plan.getName());
        sub.setStartDate(LocalDate.now());
        sub.setPriceWithoutTax(plan.getPriceWithoutTax());
        sub.setTaxPercent(plan.getTaxPercent());
        sub.setPriceWithTax(PricingCalculator.withTax(plan.getPriceWithoutTax(), plan.getTaxPercent()));
        sub.setStatus(SubscriptionStatus.PENDING_PAYMENT);
        return sub;
    }

    private GatewayOrderDto requestGatewayOrder(Organization org, Subscription sub) {
        GatewayOrderResult result = paymentGatewayService.createOrder(sub.getPriceWithTax(), "INR", org.getOrganizationCode());
        return new GatewayOrderDto(org.getId(), paymentGatewayService.gatewayName(), result.gatewayOrderId(), result.amount(), result.currency(), result.publicKey(), result.mock());
    }

    /** One reserved, non-public Plan row per organization for its custom selection — reused (upserted) if they change their mind before paying, rather than accumulating a new row per attempt. */
    private Plan requireOrCreateCustomPlan(Organization org, Set<ModuleGroup> modules, int maxBranches, int maxUsers,
                                            int maxDoctorsPerBranch, java.math.BigDecimal priceWithoutTax) {
        String code = "CUSTOM-" + org.getOrganizationCode();
        Plan plan = planRepository.findByCode(code).orElseGet(Plan::new);
        plan.setCode(code);
        plan.setName("Custom Plan");
        plan.setTagline("Built for " + org.getName());
        plan.setPriceLabel("Custom");
        plan.setStorageLabel("100 GB");
        plan.setSortOrder(998);
        plan.setMaxBranches(maxBranches);
        plan.setMaxUsers(maxUsers);
        plan.setMaxDoctorsPerBranch(maxDoctorsPerBranch);
        plan.setPriceWithoutTax(priceWithoutTax);
        plan.setTaxPercent(CUSTOM_PLAN_TAX_PERCENT);
        plan.setFreeTrial(false);
        plan.setFreeTrialDays(0);
        plan.setActive(false); // reserved — never shown in the public catalog or admin plan list
        plan.getModules().clear();
        plan.getModules().add(ModuleGroup.ORG);
        plan.getModules().add(ModuleGroup.PATIENT);
        plan.getModules().addAll(modules);
        plan.getHighlights().clear();
        plan.getHighlights().addAll(modules.stream().map(Enum::name).sorted().toList());
        return planRepository.save(plan);
    }

    /** Step 2b: verify what the gateway handed back, then activate the organization with the chosen plan for real. */
    public OrganizationDto confirmSubscriptionPayment(Long organizationId, String signupToken, ConfirmGatewayPaymentRequest request) {
        Organization org = requireDraftOrgByToken(organizationId, signupToken);
        Subscription sub = requirePendingSubscription(org);

        boolean valid = paymentGatewayService.verifyPayment(request.gatewayOrderId(), request.gatewayPaymentId(), request.signature());
        if (!valid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This payment could not be verified with the gateway.");
        }

        sub.setStatus(SubscriptionStatus.ACTIVE);
        sub.setPaymentGateway(paymentGatewayService.gatewayName());
        sub.setGatewayOrderId(request.gatewayOrderId());
        sub.setGatewayPaymentId(request.gatewayPaymentId());
        sub.setStartDate(LocalDate.now());
        sub.setEndDate(LocalDate.now().plusMonths(1));
        subscriptionRepository.save(sub);

        org.setPlan(sub.getPlan());
        org.setStatus(OrgStatus.ACTIVE);
        org.setRenewsOn(sub.getEndDate());
        org.setSignupToken(null);
        organizationRepository.save(org);

        return DtoMapper.toDto(org, branchRepository.findByOrganizationId(org.getId()));
    }

    // ---------------- Org self-service: re-subscribe (req #4) ----------------

    /**
     * Used by an Owner whose login AppUserPrincipal.isEnabled() still allows
     * through despite the org not being fully active: DRAFT (signed up via
     * /subscribe but never paid) or SUSPENDED/CANCELLED (lapsed) — this is
     * how they pick a plan and pay to activate/reactivate.
     */
    public GatewayOrderDto createPlanChangeGatewayOrder(Organization organization, String planCode) {
        Plan plan = requirePlan(planCode);
        if (plan.isFreeTrial()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Free trial is only available when first creating an organization.");
        }

        cancelPendingSubscriptions(organization.getId());

        Subscription sub = new Subscription();
        sub.setOrganization(organization);
        sub.setPlan(plan);
        sub.setPlanCodeSnapshot(plan.getCode());
        sub.setPlanNameSnapshot(plan.getName());
        sub.setStartDate(LocalDate.now());
        sub.setPriceWithoutTax(plan.getPriceWithoutTax());
        sub.setTaxPercent(plan.getTaxPercent());
        sub.setPriceWithTax(PricingCalculator.withTax(plan.getPriceWithoutTax(), plan.getTaxPercent()));
        sub.setStatus(SubscriptionStatus.PENDING_PAYMENT);
        subscriptionRepository.save(sub);

        GatewayOrderResult result = paymentGatewayService.createOrder(sub.getPriceWithTax(), "INR", organization.getOrganizationCode());
        return new GatewayOrderDto(organization.getId(), paymentGatewayService.gatewayName(), result.gatewayOrderId(), result.amount(), result.currency(), result.publicKey(), result.mock());
    }

    public OrganizationDto confirmPlanChangePayment(Organization organization, ConfirmGatewayPaymentRequest request) {
        Subscription sub = requirePendingSubscription(organization);

        boolean valid = paymentGatewayService.verifyPayment(request.gatewayOrderId(), request.gatewayPaymentId(), request.signature());
        if (!valid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This payment could not be verified with the gateway.");
        }

        subscriptionRepository.findFirstByOrganizationIdAndStatusOrderByStartDateDesc(organization.getId(), SubscriptionStatus.ACTIVE)
                .ifPresent(previous -> {
                    previous.setStatus(SubscriptionStatus.SUPERSEDED);
                    subscriptionRepository.save(previous);
                });

        sub.setStatus(SubscriptionStatus.ACTIVE);
        sub.setPaymentGateway(paymentGatewayService.gatewayName());
        sub.setGatewayOrderId(request.gatewayOrderId());
        sub.setGatewayPaymentId(request.gatewayPaymentId());
        sub.setStartDate(LocalDate.now());
        sub.setEndDate(LocalDate.now().plusMonths(1));
        subscriptionRepository.save(sub);

        organization.setPlan(sub.getPlan());
        organization.setStatus(OrgStatus.ACTIVE);
        organization.setRenewsOn(sub.getEndDate());
        organizationRepository.save(organization);

        return DtoMapper.toDto(organization, branchRepository.findByOrganizationId(organization.getId()));
    }

    private Organization requireDraftOrgByToken(Long organizationId, String signupToken) {
        Organization org = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found."));
        if (signupToken == null || signupToken.isBlank() || !signupToken.equals(org.getSignupToken())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid or expired signup session.");
        }
        if (org.getStatus() != OrgStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This organization has already completed signup.");
        }
        return org;
    }

    private Subscription requirePendingSubscription(Organization org) {
        return subscriptionRepository.findFirstByOrganizationIdAndStatusOrderByStartDateDesc(org.getId(), SubscriptionStatus.PENDING_PAYMENT)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "No pending subscription found for this organization."));
    }

    /** Cancels any earlier unpaid attempt for this org (e.g. from a first select-plan try, or the account-creation step) so it doesn't sit around forever and confuse the platform subscriptions list. */
    private void cancelPendingSubscriptions(Long organizationId) {
        subscriptionRepository.findByOrganizationIdOrderByStartDateDesc(organizationId).stream()
                .filter(s -> s.getStatus() == SubscriptionStatus.PENDING_PAYMENT)
                .forEach(s -> {
                    s.setStatus(SubscriptionStatus.CANCELLED);
                    subscriptionRepository.save(s);
                });
    }

    // ---------------- Org self-service: profile & settings ----------------

    @Transactional(readOnly = true)
    public OrganizationDto getProfile(Organization organization) {
        return DtoMapper.toDto(organization, branchRepository.findByOrganizationId(organization.getId()));
    }

    public OrganizationDto updateProfile(Organization organization, UpdateOrganizationProfileRequest request) {
        organization.setName(request.name());
        organization.setEmail(request.email());
        organization.setPhone(request.phone());
        organization.setAddressLine1(request.addressLine1());
        organization.setAddressLine2(request.addressLine2());
        organization.setCity(request.city());
        organization.setState(request.state());
        organization.setCountry(request.country());
        organization.setPostalCode(request.postalCode());
        if (request.timezone() != null && !request.timezone().isBlank()) organization.setTimezone(request.timezone());
        if (request.currency() != null && !request.currency().isBlank()) organization.setCurrency(request.currency());
        organization.setGstNumber(request.gstNumber());
        organization.setRegistrationNumber(request.registrationNumber());
        organization.setWebsite(request.website());
        organization.setLogoUrl(request.logoUrl());
        organizationRepository.save(organization);
        return DtoMapper.toDto(organization, branchRepository.findByOrganizationId(organization.getId()));
    }

    /** Not read-only: requireSettings() auto-creates the row on an organization's first visit here. */
    public OrganizationSettingsDto getSettings(Organization organization) {
        return toDto(requireSettings(organization));
    }

    public OrganizationSettingsDto updateSettings(Organization organization, UpdateOrganizationSettingsRequest request) {
        OrganizationSettings settings = requireSettings(organization);
        settings.setDateFormat(request.dateFormat());
        settings.setTimeFormat(request.timeFormat());
        settings.setAppointmentSlotMinutes(request.appointmentSlotMinutes() > 0 ? request.appointmentSlotMinutes() : 15);
        settings.setAppointmentBufferMinutes(Math.max(request.appointmentBufferMinutes(), 0));
        settings.setAllowOverbooking(request.allowOverbooking());
        settings.setBusinessHoursJson(request.businessHoursJson());
        settings.setEmailNotificationsEnabled(request.emailNotificationsEnabled());
        settings.setSmsNotificationsEnabled(request.smsNotificationsEnabled());
        organizationSettingsRepository.save(settings);
        return toDto(settings);
    }

    private OrganizationSettings requireSettings(Organization organization) {
        return organizationSettingsRepository.findByOrganizationId(organization.getId())
                .orElseGet(() -> {
                    OrganizationSettings s = new OrganizationSettings();
                    s.setOrganization(organization);
                    return organizationSettingsRepository.save(s);
                });
    }

    private OrganizationSettingsDto toDto(OrganizationSettings s) {
        return new OrganizationSettingsDto(s.getDateFormat(), s.getTimeFormat(), s.getAppointmentSlotMinutes(),
                s.getAppointmentBufferMinutes(), s.isAllowOverbooking(), s.getBusinessHoursJson(),
                s.isEmailNotificationsEnabled(), s.isSmsNotificationsEnabled());
    }

    // ---------------- Org self-service: branches ----------------

    @Transactional(readOnly = true)
    public List<BranchDto> listBranches(Organization organization) {
        return branchRepository.findByOrganizationId(organization.getId()).stream().map(DtoMapper::toDto).toList();
    }

    /** Branch Creation Rules (spec §19-20): subscription branch limit is enforced here, every time. */
    public BranchDto createBranch(Organization organization, CreateBranchRequest request) {
        long currentActive = branchRepository.findByOrganizationId(organization.getId()).stream()
                .filter(b -> b.getStatus() != BranchStatus.CLOSED)
                .count();
        if (currentActive >= organization.getPlan().getMaxBranches()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Your subscription branch limit has been reached.");
        }

        Branch branch = new Branch();
        branch.setOrganization(organization);
        branch.setName(request.name());
        branch.setHeadOffice(false);
        branch.setStatus(BranchStatus.ACTIVE);
        branch.setEmail(request.email());
        branch.setPhone(request.phone());
        branch.setAddressLine1(request.addressLine1());
        branch.setCity(request.city());
        branch.setState(request.state());
        branch.setCountry(request.country());
        branch.setPostalCode(request.postalCode());

        Set<ModuleGroup> allowed = effectiveModules(organization);
        if (request.enabledModules() != null && !request.enabledModules().isEmpty()) {
            for (String raw : request.enabledModules()) {
                ModuleGroup group;
                try {
                    group = ModuleGroup.valueOf(raw.toUpperCase(Locale.ROOT));
                } catch (IllegalArgumentException ex) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown module: " + raw);
                }
                if (!allowed.contains(group)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                            "This organization doesn't have " + group + " enabled — a branch can't run it either.");
                }
                branch.getEnabledModules().add(group);
            }
        } else {
            branch.getEnabledModules().addAll(allowed);
        }

        branch = branchRepository.save(branch);
        return DtoMapper.toDto(branch);
    }

    public BranchDto updateBranchStatus(Organization organization, Long branchId, UpdateBranchStatusRequest request) {
        Branch branch = branchRepository.findById(branchId)
                .filter(b -> b.getOrganization().getId().equals(organization.getId()))
                .orElseThrow(() -> new EntityNotFoundException("Branch not found: " + branchId));
        if (branch.isHeadOffice() && "CLOSED".equalsIgnoreCase(request.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The head office branch can't be closed.");
        }
        try {
            branch.setStatus(BranchStatus.valueOf(request.status().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown branch status: " + request.status());
        }
        branchRepository.save(branch);
        return DtoMapper.toDto(branch);
    }

    // ---------------- Shared helpers ----------------

    private Organization buildOrganizationShell(PublicOrganizationSignupRequest request, OrgType orgType, OrgCreationSource source) {
        Organization org = new Organization();
        org.setOrganizationCode(generateOrganizationCode());
        org.setSlug(generateUniqueSlug(request.organizationName()));
        org.setName(request.organizationName());
        org.setSubdomain(request.subdomain());
        org.setOrgType(orgType);
        org.setCreationSource(source);
        org.setEmail(request.email() != null && !request.email().isBlank() ? request.email() : request.ownerEmail());
        org.setPhone(request.phone());
        org.setAddressLine1(request.addressLine1());
        org.setAddressLine2(request.addressLine2());
        org.setCity(request.city());
        org.setState(request.state());
        org.setCountry(request.country());
        org.setPostalCode(request.postalCode());
        org.setGstNumber(request.gstNumber());
        org.setRegistrationNumber(request.registrationNumber());
        org.setWebsite(request.website());
        return org;
    }

    /** Every plan-assignment path builds a Subscription the same way; only start status / dates differ by caller. */
    private Subscription newSubscriptionFor(Plan plan) {
        Subscription sub = new Subscription();
        sub.setPlan(plan);
        sub.setPlanCodeSnapshot(plan.getCode());
        sub.setPlanNameSnapshot(plan.getName());
        sub.setStartDate(LocalDate.now());
        sub.setPriceWithoutTax(plan.getPriceWithoutTax());
        sub.setTaxPercent(plan.getTaxPercent());
        sub.setPriceWithTax(PricingCalculator.withTax(plan.getPriceWithoutTax(), plan.getTaxPercent()));
        sub.setStatus(SubscriptionStatus.ACTIVE);
        if (plan.isFreeTrial()) {
            sub.setFreeTrial(true);
            sub.setFreeTrialDays(plan.getFreeTrialDays());
            sub.setEndDate(LocalDate.now().plusDays(plan.getFreeTrialDays()));
        } else {
            sub.setEndDate(LocalDate.now().plusMonths(1));
        }
        return sub;
    }

    /** Settings + Communication Engine starter data + head branch — every creation path needs all three, in this order. */
    private Branch provisionSettingsAndHeadBranch(Organization org, String headBranchName) {
        OrganizationSettings settings = new OrganizationSettings();
        settings.setOrganization(org);
        organizationSettingsRepository.save(settings);

        notificationService.getOrCreateSettings(org);
        notificationTemplateService.seedDefaults(org);

        Branch head = new Branch();
        head.setOrganization(org);
        head.setName(headBranchName);
        head.setHeadOffice(true);
        head.setStatus(BranchStatus.ACTIVE);
        head.getEnabledModules().addAll(effectiveModules(org));
        return branchRepository.save(head);
    }

    private void inviteOwner(Organization org, Branch head, String ownerFullName, String ownerEmail) {
        Role ownerRole = roleRepository.findByCode("ORG_OWNER")
                .orElseThrow(() -> new IllegalStateException("System role ORG_OWNER is missing — check DataSeeder"));
        userInvitationService.invite(org, Portal.TENANT, ownerRole, ownerFullName, ownerEmail,
                head, BranchScope.ALL_BRANCHES, Set.of());
    }

    private void requireEmailAvailable(String email) {
        if (appUserRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }
    }

    private void requireSubdomainAvailable(String subdomain) {
        if (subdomain != null && !subdomain.isBlank() && organizationRepository.findBySubdomain(subdomain).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This subdomain is already taken — please choose another.");
        }
    }

    private OrgType requireOrgType(String code) {
        return orgTypeRepository.findByCode(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown organization type: " + code));
    }

    private Plan requirePlan(String code) {
        return planRepository.findByCode(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown plan: " + code));
    }

    private Set<ModuleGroup> effectiveModules(Organization organization) {
        return BUSINESS_MODULES.stream()
                .filter(g -> organization.getOrgType().getModules().contains(g) && organization.getPlan().getModules().contains(g))
                .collect(Collectors.toSet());
    }

    private String generateOrganizationCode() {
        long n = organizationRepository.nextOrganizationCodeNumber();
        return "ORG-" + String.format("%06d", n);
    }

    private String generateUniqueSlug(String name) {
        String base = name.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        if (base.isBlank()) base = "organization";
        String candidate = base;
        int suffix = 2;
        while (organizationRepository.existsBySlug(candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }
}
