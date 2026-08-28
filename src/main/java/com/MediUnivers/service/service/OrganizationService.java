package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.*;
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
import java.util.stream.Collectors;

/**
 * Creating an organization is the one moment several dynamic pieces come
 * together (Organization Foundation spec §7 — "Organization Provisioning
 * Service", one flow regardless of where the signup came from): pick an
 * Organization Type, pick a Plan, and get back a ready-to-use tenant — a
 * unique code, a head branch, org settings, and an Org Owner invited (not
 * handed a password directly) to set up their own login.
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
        if (appUserRepository.existsByEmailIgnoreCase(request.ownerEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }

        OrgType orgType = orgTypeRepository.findByCode(request.orgTypeCode())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Unknown organization type: " + request.orgTypeCode()));
        Plan plan = planRepository.findByCode(request.planCode())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Unknown plan: " + request.planCode()));

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
        org.setPlan(plan);
        org.setStatus(OrgStatus.TRIAL);
        org.setCreationSource(source);
        org.setEmail(request.ownerEmail());
        org.setRenewsOn(LocalDate.now().plusDays(14));
        org = organizationRepository.save(org);

        OrganizationSettings settings = new OrganizationSettings();
        settings.setOrganization(org);
        organizationSettingsRepository.save(settings);

        Branch head = new Branch();
        head.setOrganization(org);
        head.setName(request.headBranchName());
        head.setHeadOffice(true);
        head.setStatus(BranchStatus.ACTIVE);
        head.getEnabledModules().addAll(effectiveModules(org));
        head = branchRepository.save(head);

        Role ownerRole = roleRepository.findByCode("ORG_OWNER")
                .orElseThrow(() -> new IllegalStateException("System role ORG_OWNER is missing — check DataSeeder"));

        userInvitationService.invite(org, Portal.TENANT, ownerRole, request.ownerFullName(), request.ownerEmail(),
                head, BranchScope.ALL_BRANCHES, Set.of());

        return DtoMapper.toDto(org, List.of(head));
    }

    public OrganizationDto changePlan(Long organizationId, String planCode) {
        Organization org = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new EntityNotFoundException("Organization not found: " + organizationId));
        Plan plan = planRepository.findByCode(planCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown plan: " + planCode));
        org.setPlan(plan);
        organizationRepository.save(org);
        return DtoMapper.toDto(org, branchRepository.findByOrganizationId(organizationId));
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

    @Transactional(readOnly = true)
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
