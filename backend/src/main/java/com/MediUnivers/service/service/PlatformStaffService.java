package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.domain.Portal;
import com.MediUnivers.service.domain.Role;
import com.MediUnivers.service.domain.UserStatus;
import com.MediUnivers.service.dto.CreatePlatformStaffRequest;
import com.MediUnivers.service.dto.PlatformStaffDto;
import com.MediUnivers.service.dto.UpdatePlatformStaffRequest;
import com.MediUnivers.service.repository.AppUserRepository;
import com.MediUnivers.service.repository.RoleRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** MediUnivers staff (organization == null) — reuses the same invite mechanism tenant users go through. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlatformStaffService {

    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final UserInvitationService userInvitationService;
    private final AuditLogService auditLogService;
    private final com.MediUnivers.service.security.CurrentUserService currentUserService;

    public List<PlatformStaffDto> listAll() {
        return appUserRepository.findByOrganizationIsNullOrderByFullNameAsc().stream()
                .map(PlatformStaffService::toDto).toList();
    }

    @Transactional
    public PlatformStaffDto invite(CreatePlatformStaffRequest request) {
        Role role = roleRepository.findByCode(request.roleCode())
                .orElseThrow(() -> new EntityNotFoundException("Unknown role: " + request.roleCode()));
        AppUser user = userInvitationService.invite(null, Portal.PLATFORM, role, request.fullName(), request.email(),
                null, null, null);
        auditLogService.record(currentUserService.require(), "CREATED", "PLATFORM_STAFF", user.getEmail(), null);
        return toDto(user);
    }

    @Transactional
    public PlatformStaffDto update(Long id, UpdatePlatformStaffRequest request) {
        AppUser user = appUserRepository.findById(id)
                .filter(u -> u.getOrganization() == null)
                .orElseThrow(() -> new EntityNotFoundException("Staff member not found: " + id));
        Role role = roleRepository.findByCode(request.roleCode())
                .orElseThrow(() -> new EntityNotFoundException("Unknown role: " + request.roleCode()));
        user.setRole(role);
        user.setStatus(UserStatus.valueOf(request.status()));
        return toDto(appUserRepository.save(user));
    }

    private static PlatformStaffDto toDto(AppUser u) {
        return new PlatformStaffDto(u.getId(), u.getFullName(), u.getEmail(),
                u.getRole().getCode(), u.getRole().getName(), u.getStatus().name());
    }
}
