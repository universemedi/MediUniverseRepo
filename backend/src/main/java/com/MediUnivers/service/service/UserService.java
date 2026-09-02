package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.ChangePasswordRequest;
import com.MediUnivers.service.dto.CreateUserRequest;
import com.MediUnivers.service.dto.MeResponse;
import com.MediUnivers.service.dto.MyProfileDto;
import com.MediUnivers.service.dto.OrgUserDto;
import com.MediUnivers.service.dto.UpdateMyProfileRequest;
import com.MediUnivers.service.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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
    private final PasswordEncoder passwordEncoder;
    private final PlatformNotificationService platformNotificationService;

    @Transactional(readOnly = true)
    public List<OrgUserDto> listForOrganization(Long organizationId) {
        return appUserRepository.findByOrganizationIdAndPortal(organizationId, Portal.TENANT).stream()
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
        // User Limit Validation (spec §30) — counts everyone who occupies a STAFF seat,
        // invited or already active; Patient Portal accounts never count against this limit.
        long occupiedSeats = appUserRepository.countByOrganizationIdAndPortalAndStatusIn(
                organization.getId(), Portal.TENANT, List.of(UserStatus.ACTIVE, UserStatus.INVITED));
        if (occupiedSeats >= organization.getPlan().getMaxUsers()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Your subscription user limit has been reached.");
        }

        Role role = requireUsableRole(organization, request.roleCode());

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

    private Role requireUsableRole(Organization organization, String roleCode) {
        Role role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown role: " + roleCode));
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
        return role;
    }

    /** Role, primary branch and active/disabled state — the fields an org admin actually
     * revisits after inviting someone. Branch scope (all vs. selected branches) stays as set at
     * invitation time; re-scoping it isn't exposed here yet. */
    public OrgUserDto updateOrgUser(Organization organization, Long userId, com.MediUnivers.service.dto.UpdateUserRequest request) {
        AppUser user = appUserRepository.findById(userId)
                .filter(u -> u.getOrganization() != null && u.getOrganization().getId().equals(organization.getId()))
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        user.setRole(requireUsableRole(organization, request.roleCode()));

        if (request.branchId() != null) {
            Branch branch = branchRepository.findById(request.branchId())
                    .filter(b -> b.getOrganization().getId().equals(organization.getId()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch does not belong to this organization."));
            user.setBranch(branch);
        }

        if (request.status() != null && !request.status().isBlank()) {
            UserStatus status;
            try {
                status = UserStatus.valueOf(request.status().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown status: " + request.status());
            }
            if (status == UserStatus.INVITED) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invited is set automatically — pick Active or Disabled.");
            }
            if (user.getStatus() == UserStatus.INVITED && status == UserStatus.ACTIVE) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "This user hasn't accepted their invitation yet — resend it instead of activating manually.");
            }
            user.setStatus(status);
        }

        appUserRepository.save(user);
        return new OrgUserDto(user.getId(), user.getFullName(), user.getEmail(),
                user.getRole().getCode(), user.getRole().getName(),
                user.getBranch() != null ? user.getBranch().getId() : null,
                user.getBranch() != null ? user.getBranch().getName() : null,
                user.getStatus());
    }

    /** Every logged-in user, any portal, editing their own account — no admin permission needed. */
    @Transactional(readOnly = true)
    public MyProfileDto getOwnProfile(AppUser user) {
        return toProfileDto(user);
    }

    public MyProfileDto updateOwnProfile(AppUser user, UpdateMyProfileRequest request) {
        String newEmail = request.email().trim();
        if (!newEmail.equalsIgnoreCase(user.getEmail()) && appUserRepository.existsByEmailIgnoreCase(newEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Another account already uses this email.");
        }
        user.setFullName(request.fullName().trim());
        user.setEmail(newEmail);
        user.setPhone(request.phone() != null && !request.phone().isBlank() ? request.phone().trim() : null);
        user.setDateOfBirth(request.dateOfBirth());
        return toProfileDto(appUserRepository.save(user));
    }

    /** Every logged-in user, any portal, changing their own password — requires knowing the current one, unlike the forgot-password token flow. */
    public void changeOwnPassword(AppUser user, ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect.");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        appUserRepository.save(user);

        platformNotificationService.notify(PlatformNotificationEventType.PASSWORD_CHANGED,
                new NotificationRecipient(user.getFullName(), user.getEmail(), user.getPhone(), user.getId()),
                Map.of("fullName", user.getFullName()),
                NotificationPriority.HIGH, "APP_USER", user.getId());
    }

    private MyProfileDto toProfileDto(AppUser user) {
        return new MyProfileDto(user.getFullName(), user.getEmail(), user.getPhone(), user.getDateOfBirth());
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
