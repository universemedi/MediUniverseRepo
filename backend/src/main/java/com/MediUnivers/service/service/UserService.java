package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.CreateUserRequest;
import com.MediUnivers.service.dto.MeResponse;
import com.MediUnivers.service.dto.OrgUserDto;
import com.MediUnivers.service.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final BranchRepository branchRepository;
    private final OrgModuleService orgModuleService;
    private final UserInvitationService userInvitationService;

    @Transactional(readOnly = true)
    public List<OrgUserDto> listForOrganization(Long organizationId) {
        return appUserRepository.findByOrganizationId(organizationId).stream()
                .map(u -> new OrgUserDto(
                        u.getId(), u.getFullName(), u.getEmail(),
                        u.getRole().getCode(), u.getRole().getName(),
                        u.getBranch() != null ? u.getBranch().getId() : null,
                        u.getBranch() != null ? u.getBranch().getName() : null,
                        u.getStatus()))
                .toList();
    }

    /**
     * Org Admin adds a staff user (spec §29 "User Invitation Flow"): created
     * INVITED with no password, an email carries the setup link (logged in
     * place of real delivery — see UserInvitationService), and they only
     * become ACTIVE once they accept it and set their own password.
     */
    public MeResponse createOrgUser(Organization organization, CreateUserRequest request) {
        // User Limit Validation (spec §30) — counts everyone who occupies a seat,
        // invited or already active.
        long occupiedSeats = appUserRepository.countByOrganizationIdAndStatusIn(
                organization.getId(), List.of(UserStatus.ACTIVE, UserStatus.INVITED));
        if (occupiedSeats >= organization.getPlan().getMaxUsers()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Your subscription user limit has been reached.");
        }

        Role role = roleRepository.findByCode(request.roleCode())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown role: " + request.roleCode()));
        boolean roleUsableByThisOrg = role.getPortal() == Portal.TENANT
                && (role.getOrganization() == null || role.getOrganization().getId().equals(organization.getId()));
        if (!roleUsableByThisOrg) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "That role does not belong to this organization.");
        }

        // Custom, org-specific roles can only grant modules the organization currently has
        // enabled (business type runs it AND the subscription pays for it) — a custom
        // pharmacist role, say, can't be handed out if Pharmacy isn't on the plan yet.
        // System roles (Org Owner, Org Admin, ...) are exempt: an Owner must be creatable even
        // before every module on their plan is purchased — they're the one who upgrades it.
        if (!role.isSystem()) {
            var enabledGroups = orgModuleService.statusFor(organization).stream()
                    .filter(com.MediUnivers.service.dto.OrgModuleStatusDto::enabled)
                    .map(com.MediUnivers.service.dto.OrgModuleStatusDto::group)
                    .collect(java.util.stream.Collectors.toSet());
            boolean grantsOnlyEnabledModules = role.getGroupAccess().stream()
                    .allMatch(access -> access.getModuleGroup() == ModuleGroup.ORG
                            || access.getModuleGroup() == ModuleGroup.PATIENT
                            || access.getModuleGroup() == ModuleGroup.BILLING
                            || enabledGroups.contains(access.getModuleGroup()));
            if (!grantsOnlyEnabledModules) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "This role grants access to a module your organization hasn't enabled yet. "
                                + "Check Subscription & Billing or Configure Modules.");
            }
        }

        Branch primaryBranch = null;
        if (request.branchId() != null) {
            primaryBranch = branchRepository.findById(request.branchId())
                    .filter(b -> b.getOrganization().getId().equals(organization.getId()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch does not belong to this organization."));
        }

        BranchScope scope = BranchScope.ALL_BRANCHES;
        if (request.branchScope() != null && !request.branchScope().isBlank()) {
            try {
                scope = BranchScope.valueOf(request.branchScope().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown branch scope: " + request.branchScope());
            }
        }

        Set<Branch> selected = new HashSet<>();
        if (scope == BranchScope.SELECTED_BRANCHES && request.selectedBranchIds() != null) {
            for (Long id : request.selectedBranchIds()) {
                Branch b = branchRepository.findById(id)
                        .filter(x -> x.getOrganization().getId().equals(organization.getId()))
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch does not belong to this organization."));
                selected.add(b);
            }
        }

        AppUser user = userInvitationService.invite(organization, Portal.TENANT, role, request.fullName(),
                request.email(), primaryBranch, scope, selected);
        return toMeResponse(user);
    }

    public MeResponse resendInvitation(Organization organization, Long userId) {
        AppUser user = userInvitationService.resend(organization, userId);
        return toMeResponse(user);
    }

    public MeResponse toMeResponse(AppUser user) {
        var roleDto = DtoMapper.toDto(user.getRole());
        var orgDto = user.getOrganization() == null ? null
                : DtoMapper.toDto(user.getOrganization(), branchRepository.findByOrganizationId(user.getOrganization().getId()));
        return new MeResponse(user.getId(), user.getFullName(), user.getEmail(), user.getPortal(), roleDto,
                orgDto, user.getBranch() != null ? user.getBranch().getName() : null,
                user.getBranch() != null ? user.getBranch().getId() : null);
    }
}
